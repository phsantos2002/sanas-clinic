import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";
import { fireTrigger } from "@/services/workflowEngine";
import { logger } from "@/lib/logger";
import { normalizePhone, phonesMatch } from "@/lib/phone";
import { createHash } from "crypto";

// ── Postgres advisory lock helpers ─────────────────────────
// Used to serialize parallel jobs touching the same lead — prevents duplicate
// AI replies when the same chat receives multiple messages near-simultaneously.

function leadLockId(leadId: string): string {
  // Take 8 bytes of sha256 → fits in BIGINT (signed range OK for advisory lock).
  // Returned as decimal string to be inlined safely in raw SQL.
  const hash = createHash("sha256").update(`ai_reply:${leadId}`).digest();
  const lo = hash.readUInt32BE(0) & 0x7fffffff; // mask MSB to keep positive
  const hi = hash.readUInt32BE(4);
  return (BigInt(lo) * BigInt(0x100000000) + BigInt(hi)).toString();
}

async function tryAcquireLeadLock(leadId: string): Promise<boolean> {
  const id = leadLockId(leadId);
  const rows = await prisma.$queryRawUnsafe<{ acquired: boolean }[]>(
    `SELECT pg_try_advisory_lock(${id}::bigint) AS acquired`
  );
  return rows[0]?.acquired === true;
}

async function releaseLeadLock(leadId: string): Promise<void> {
  const id = leadLockId(leadId);
  await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock(${id}::bigint)`).catch(() => {});
}

type AdAttribution = {
  adId?: string | null;
  adSetId?: string | null;
  campaignId?: string | null;
  adName?: string | null;
  adSetName?: string | null;
  campaignName?: string | null;
};

type SendFn = (phone: string, text: string) => Promise<{ success: boolean; error?: string }>;
type SendMediaFn =
  | ((
      phone: string,
      url: string,
      caption?: string
    ) => Promise<{ success: boolean; error?: string }>)
  | null;
type SendAudioFn =
  | ((phone: string, audioUrl: string) => Promise<{ success: boolean; error?: string }>)
  | null;
type MarkUnreadFn = ((chatId: string) => Promise<void>) | null;

/**
 * Shared message processor for both WhatsApp Cloud API and Uazapi webhooks.
 * Full feature set: delays, whitelist/blacklist, human intervention, audio, vault media.
 */
export async function processIncomingMessage(params: {
  userId: string;
  phone: string;
  text: string;
  pushName: string;
  messageType?: string;
  isFromApi?: boolean;
  attribution?: AdAttribution;
  sendReply: SendFn;
  sendMedia?: SendMediaFn;
  sendAudio?: SendAudioFn;
  markUnread?: MarkUnreadFn;
  chatId?: string;
  /** Sprint 2: ID da mensagem no provider para idempotência */
  externalMessageId?: string;
}) {
  const {
    userId,
    phone,
    text,
    pushName,
    messageType,
    attribution,
    sendReply,
    sendMedia,
    sendAudio,
    markUnread,
    chatId,
    externalMessageId,
  } = params;

  const log = logger.child({ userId, phone: phone.slice(-4), externalMessageId });
  log.debug("webhook_processing_start", { text: text.slice(0, 50) });

  // ── Load AI config ────────────────────────────────────────
  const aiConfig = await getAIConfigForWebhook(userId);

  // ── Whitelist / Blacklist check ───────────────────────────
  if (aiConfig) {
    const cleanPhone = normalizePhone(phone);
    if (aiConfig.whitelist && aiConfig.whitelist.length > 0) {
      const inWhitelist = aiConfig.whitelist.some((w) => phonesMatch(cleanPhone, w));
      if (!inWhitelist) {
        log.info("webhook_whitelist_skip", { phone: phone.slice(-4) });
        return;
      }
    }
    if (aiConfig.blacklist && aiConfig.blacklist.length > 0) {
      const inBlacklist = aiConfig.blacklist.some((b) => phonesMatch(cleanPhone, b));
      if (inBlacklist) {
        log.info("webhook_blacklist_skip", { phone: phone.slice(-4) });
        return;
      }
    }
  }

  // ── Deduplication ─────────────────────────────────────────
  // Primary: externalMessageId — reliable, provider-guaranteed unique
  if (externalMessageId) {
    const existingLead = await findLead(userId, phone);
    if (existingLead) {
      const existingMsg = await prisma.message.findFirst({
        where: { leadId: existingLead.id, externalId: externalMessageId },
      });
      if (existingMsg) {
        log.info("webhook_duplicate_external_id_skip", { externalMessageId });
        return;
      }
    }
  } else {
    // Fallback: content+60s window for providers without message IDs
    const existingMsg = await prisma.message.findFirst({
      where: {
        content: text,
        role: "user",
        lead: { userId, phone },
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (existingMsg) {
      log.info("webhook_duplicate_content_skip");
      return;
    }
  }

  // ── Handle unknown message types ──────────────────────────
  if (
    messageType &&
    !["text", "conversation", "extendedTextMessage"].includes(messageType.toLowerCase())
  ) {
    if (aiConfig?.unknownTypeMsg) {
      await sendReply(phone, aiConfig.unknownTypeMsg);
    }
    // Still save the message but don't process with AI
    const lead = await findLead(userId, phone);
    if (lead) {
      await prisma.message.create({
        data: {
          leadId: lead.id,
          role: "user",
          content: `[${messageType}] ${text || ""}`.trim(),
          externalId: externalMessageId ?? null,
        },
      });
    }
    return;
  }

  // ── Find or create lead ───────────────────────────────────
  let isNewLead = false;
  let lead = await findLead(userId, phone);

  if (!lead) {
    lead = await createLead(userId, phone, pushName, attribution);
    isNewLead = true;
    log.info("webhook_lead_created", { leadId: lead.id });
  }

  // Fire new_lead workflow trigger (non-blocking)
  if (isNewLead) {
    fireTrigger(userId, "new_lead", lead.id).catch(() => {});
  }

  // ── Update attribution if missing ─────────────────────────
  if (attribution?.adId && !lead.metaAdId) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        source: "meta",
        medium: "cpc",
        metaAdId: attribution.adId,
        metaAdSetId: attribution.adSetId ?? null,
        metaCampaignId: attribution.campaignId ?? null,
        adName: attribution.adName ?? lead.adName,
        adSetName: attribution.adSetName ?? lead.adSetName,
        campaign: attribution.campaignName ?? lead.campaign,
      },
    });
  }

  // ── Save incoming message + update lastInteractionAt ─────
  await prisma.$transaction([
    prisma.message.create({
      data: {
        leadId: lead.id,
        role: "user",
        content: text,
        externalId: externalMessageId ?? null,
      },
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: { lastInteractionAt: new Date() },
    }),
  ]);

  // ── Cadência: parar sequências ativas se lead respondeu ──
  // Outbound sequences com stopOnReply=true são interrompidas quando o lead
  // manda qualquer mensagem — evita disparar próximos toques ao lead engajado.
  await prisma.workflowExecution
    .updateMany({
      where: {
        leadId: lead.id,
        status: "running",
        workflow: { isSequence: true, stopOnReply: true, userId },
      },
      data: { status: "stopped", completedAt: new Date() },
    })
    .catch(() => {});

  // ── Check if AI should respond ────────────────────────────
  if (!lead.aiEnabled) {
    log.debug("webhook_ai_disabled", { leadId: lead.id });
    return;
  }

  // Check human intervention pause
  if (lead.humanPausedUntil && new Date() < new Date(lead.humanPausedUntil)) {
    log.debug("webhook_ai_human_paused", { pausedUntil: lead.humanPausedUntil });
    return;
  }

  if (!aiConfig?.apiKey) {
    log.warn("webhook_ai_no_api_key", { userId });
    return;
  }

  // ── Acquire per-lead lock (prevents duplicate AI replies in parallel) ──
  // If another job is already replying to this lead, exit early — that job
  // will have the latest message in its history when it queries the DB.
  const lockAcquired = await tryAcquireLeadLock(lead.id);
  if (!lockAcquired) {
    log.info("webhook_ai_lock_busy_skip", { leadId: lead.id });
    return;
  }

  try {
    // ── Wait before reply (humanized delay) ───────────────────
    const waitSeconds = aiConfig.waitBeforeReply ?? 7;
    if (waitSeconds > 0) {
      // Check if new message arrived during wait (cancelOnNewMsg)
      await sleep(waitSeconds * 1000);

      if (aiConfig.cancelOnNewMsg) {
        const newerMsg = await prisma.message.findFirst({
          where: {
            lead: { userId, phone },
            role: "user",
            createdAt: { gt: new Date(Date.now() - waitSeconds * 1000) },
            content: { not: text },
          },
        });
        if (newerMsg) {
          log.info("webhook_cancelled_newer_msg");
          return;
        }
      }
    }

    log.info("webhook_ai_generating", {
      provider: aiConfig.provider,
      model: aiConfig.model,
      leadId: lead.id,
    });

    // ── Build context with services ───────────────────────────
    const servicesContext = await getServicesContext(userId);

    // ── Build context with calendar ───────────────────────────
    let calendarContext: string | null = null;
    try {
      const { getCalendarContextForAI } = await import("@/services/googleCalendar");
      calendarContext = await getCalendarContextForAI(userId);
    } catch {}

    const history = [
      ...lead.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: text },
    ];

    // Append services context to system prompt
    let enrichedSystemPrompt = aiConfig.systemPrompt || "";
    if (servicesContext) {
      enrichedSystemPrompt += `\n\n${servicesContext}`;
    }
    if (calendarContext) {
      enrichedSystemPrompt += `\n\n${calendarContext}`;
    }

    const { reply, newStageEventName } = await generateAIReply(history, lead.name || pushName, {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: aiConfig.apiKey,
      clinicName: aiConfig.clinicName,
      systemPrompt: enrichedSystemPrompt || null,
    });

    // ── Personalize reply ─────────────────────────────────────
    let finalReply = reply;
    if (aiConfig.includeContactName && lead.name && !reply.includes(lead.name)) {
      finalReply = reply;
    }

    // ── Process calendar booking commands ─────────────────────
    const bookingMatch = finalReply.match(
      /\[AGENDAR:\s*(.+?)\s*\|\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\|\s*(.+?)\s*\|\s*(\d+)\s*\]/
    );
    if (bookingMatch) {
      try {
        const { createCalendarEvent } = await import("@/services/googleCalendar");
        const [, serviceName, dateTime, clientName, durationStr] = bookingMatch;
        const result = await createCalendarEvent(userId, {
          summary: `${serviceName} — ${clientName}`,
          description: `Agendamento via WhatsApp\nCliente: ${clientName}\nTelefone: ${phone}`,
          startDateTime: new Date(dateTime.replace(" ", "T") + ":00-03:00").toISOString(),
          durationMinutes: parseInt(durationStr) || 60,
        });
        if (result.success) {
          log.info("webhook_calendar_event_created", { eventId: result.eventId });
        } else {
          log.error("webhook_calendar_event_failed", { error: result.error });
        }
      } catch (err) {
        log.error("webhook_calendar_error", { err });
      }
      // Remove the booking tag from the reply sent to user
      finalReply = finalReply.replace(/\[AGENDAR:.*?\]/g, "").trim();
    }

    log.info("webhook_ai_reply_generated", { replyLength: finalReply.length, newStageEventName });

    // ── Save AI reply ─────────────────────────────────────────
    await prisma.message.create({
      data: { leadId: lead.id, role: "assistant", content: finalReply },
    });

    // ── Humanized delay before sending ────────────────────────
    const charDelay = Math.min(
      finalReply.length * (aiConfig.delayPerChar ?? 120),
      aiConfig.delayMax ?? 10000
    );
    if (charDelay > 0) {
      await sleep(charDelay);
    }

    // ── Send reply (text and/or audio) ────────────────────────
    const sendResult = await sendReply(phone, finalReply);
    if (!sendResult.success) {
      log.error("webhook_send_failed", { error: sendResult.error });
    } else {
      log.info("webhook_send_success");
    }

    // ── Send audio if configured ──────────────────────────────
    if (aiConfig.sendAudio && sendAudio && finalReply.length >= (aiConfig.audioMinChars ?? 50)) {
      try {
        const { generateAudio } = await import("@/services/textToSpeech");
        const audioBuffer = await generateAudio(
          finalReply,
          aiConfig.openaiKey || aiConfig.apiKey || ""
        );
        // For now, skip audio sending if we only have buffer (need URL for Uazapi)
        const audioUrl = audioBuffer ? null : null; // TODO: upload buffer to get URL
        if (audioUrl) {
          await sendAudio(phone, audioUrl);
          log.info("webhook_audio_sent");
        }
      } catch (err) {
        log.error("webhook_audio_error", { err });
      }
    }

    // ── Keep unread if configured ─────────────────────────────
    if (aiConfig.keepUnread && markUnread && chatId) {
      try {
        await markUnread(chatId);
      } catch {}
    }

    // ── Update stage if AI determined a new one ───────────────
    if (newStageEventName && newStageEventName !== lead.stage?.eventName) {
      const newStage = await prisma.stage.findFirst({
        where: { userId, eventName: newStageEventName },
      });

      if (newStage) {
        await prisma.$transaction(async (tx) => {
          await tx.lead.update({
            where: { id: lead!.id },
            data: { stageId: newStage.id },
          });
          await tx.leadStageHistory.create({
            data: { leadId: lead!.id, stageId: newStage.id },
          });
        });

        sendFacebookEvent({
          userId,
          phone: lead.phone,
          eventName: newStage.eventName,
          leadId: lead.id,
          stageName: newStage.name,
        }).catch(() => {});

        fireTrigger(userId, "stage_change", lead.id, { stageId: newStage.id }).catch(() => {});
      }
    }
  } finally {
    // Always release the lead lock so subsequent messages can be processed.
    await releaseLeadLock(lead.id);
  }
}

/**
 * Called when a manual (human) message is sent.
 * Pauses AI for this lead if humanIntervention is enabled.
 */
export async function onManualMessageSent(userId: string, leadId: string) {
  const aiConfig = await getAIConfigForWebhook(userId);
  if (!aiConfig?.humanIntervention) return;

  const pauseHours = aiConfig.humanPauseHours ?? 2;
  const pauseUntil = new Date(Date.now() + pauseHours * 60 * 60 * 1000);

  await prisma.lead.update({
    where: { id: leadId },
    data: { humanPausedUntil: pauseUntil },
  });

  logger.info("webhook_ai_human_pause_set", { leadId, pauseUntil: pauseUntil.toISOString() });
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAIConfigForWebhook(userId: string) {
  return prisma.aIConfig.findUnique({ where: { userId } });
}

async function findLead(userId: string, phone: string) {
  const normalizedIncoming = normalizePhone(phone);

  // Primary: exact normalized match
  let lead = await prisma.lead.findFirst({
    where: { userId, phone: normalizedIncoming },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
      stage: true,
    },
  });
  if (lead) return lead;

  // Secondary: try with +55 prefix variants (55XX vs XX)
  const altPhone = normalizedIncoming.startsWith("55")
    ? normalizedIncoming.slice(2) // strip country code
    : `55${normalizedIncoming}`; // add country code

  lead = await prisma.lead.findFirst({
    where: { userId, phone: altPhone },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
      stage: true,
    },
  });
  if (lead) {
    logger.debug("webhook_lead_found_alt_phone", {
      stored: lead.phone.slice(-4),
      incoming: phone.slice(-4),
    });
  }

  return lead;
}

async function createLead(
  userId: string,
  phone: string,
  pushName: string,
  attribution?: AdAttribution
) {
  const normalized = normalizePhone(phone);
  const firstStage = await prisma.stage.findFirst({
    where: { userId },
    orderBy: { order: "asc" },
  });

  const isFromAd = !!(attribution?.adId || attribution?.campaignId);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          name: pushName || normalized,
          phone: normalized,
          userId,
          stageId: firstStage?.id ?? null,
          source: isFromAd ? "meta" : "whatsapp",
          platform: "whatsapp",
          medium: isFromAd ? "cpc" : "organic",
          metaAdId: attribution?.adId ?? null,
          metaAdSetId: attribution?.adSetId ?? null,
          metaCampaignId: attribution?.campaignId ?? null,
          adName: attribution?.adName ?? null,
          adSetName: attribution?.adSetName ?? null,
          campaign: attribution?.campaignName ?? null,
        },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 30 },
          stage: true,
        },
      });

      if (firstStage) {
        await tx.leadStageHistory.create({
          data: { leadId: created.id, stageId: firstStage.id },
        });
      }

      return created;
    });
  } catch (err) {
    // Race: another concurrent webhook just created this lead. Postgres now
    // enforces UNIQUE(userId, phone), so we get P2002. Re-fetch and reuse.
    const isUnique =
      err instanceof Error && (err.message.includes("P2002") || err.message.includes("Unique"));
    if (isUnique) {
      logger.info("webhook_lead_create_race_recovered", { phoneSuffix: normalized.slice(-4) });
    }
    const fallback = await prisma.lead.findFirst({
      where: { userId, phone: normalized },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 30 },
        stage: true,
      },
    });
    if (!fallback) throw new Error("Failed to find or create lead");
    return fallback;
  }
}

async function getServicesContext(userId: string): Promise<string | null> {
  const services = await prisma.service.findMany({
    where: { userId, isActive: true },
    select: { name: true, description: true, price: true, duration: true, category: true },
  });

  if (services.length === 0) return null;

  const serviceList = services
    .map((s) => {
      const price = s.price > 0 ? `R$ ${s.price.toFixed(2)}` : "consultar";
      const dur = s.duration > 0 ? `${s.duration} min` : "";
      return `- ${s.name}: ${s.description || ""} | Valor: ${price} | Duração: ${dur}${s.category ? ` | Categoria: ${s.category}` : ""}`;
    })
    .join("\n");

  return `SERVIÇOS DISPONÍVEIS:
${serviceList}

Use estas informações para responder perguntas sobre preços, serviços e para auxiliar no agendamento. Quando o cliente quiser agendar, pergunte data e horário preferidos.`;
}
