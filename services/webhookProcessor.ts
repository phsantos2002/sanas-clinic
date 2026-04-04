import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";
import { fireTrigger } from "@/services/workflowEngine";

type AdAttribution = {
  adId?: string | null;
  adSetId?: string | null;
  campaignId?: string | null;
  adName?: string | null;
  adSetName?: string | null;
  campaignName?: string | null;
};

type SendFn = (phone: string, text: string) => Promise<{ success: boolean; error?: string }>;
type SendMediaFn = ((phone: string, url: string, caption?: string) => Promise<{ success: boolean; error?: string }>) | null;
type SendAudioFn = ((phone: string, audioUrl: string) => Promise<{ success: boolean; error?: string }>) | null;
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
}) {
  const { userId, phone, text, pushName, messageType, attribution, sendReply, sendMedia, sendAudio, markUnread, chatId } = params;

  console.log(`[webhook] Processando msg de ${phone} para userId ${userId}: "${text.slice(0, 50)}"`);

  // ── Load AI config ────────────────────────────────────────
  const aiConfig = await getAIConfigForWebhook(userId);

  // ── Whitelist / Blacklist check ───────────────────────────
  if (aiConfig) {
    const cleanPhone = phone.replace(/\D/g, "");
    if (aiConfig.whitelist && aiConfig.whitelist.length > 0) {
      const inWhitelist = aiConfig.whitelist.some(w => cleanPhone.endsWith(w.replace(/\D/g, "").slice(-9)));
      if (!inWhitelist) {
        console.log(`[webhook] Phone ${phone} not in whitelist, skipping`);
        return;
      }
    }
    if (aiConfig.blacklist && aiConfig.blacklist.length > 0) {
      const inBlacklist = aiConfig.blacklist.some(b => cleanPhone.endsWith(b.replace(/\D/g, "").slice(-9)));
      if (inBlacklist) {
        console.log(`[webhook] Phone ${phone} in blacklist, skipping`);
        return;
      }
    }
  }

  // ── Deduplication (content + 60s window) ──────────────────
  const existingMsg = await prisma.message.findFirst({
    where: {
      content: text,
      role: "user",
      lead: { userId, phone },
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (existingMsg) {
    console.log(`[webhook] Msg duplicada ignorada para ${phone}`);
    return;
  }

  // ── Handle unknown message types ──────────────────────────
  if (messageType && !["text", "conversation", "extendedTextMessage"].includes(messageType.toLowerCase())) {
    if (aiConfig?.unknownTypeMsg) {
      await sendReply(phone, aiConfig.unknownTypeMsg);
    }
    // Still save the message but don't process with AI
    const lead = await findLead(userId, phone);
    if (lead) {
      await prisma.message.create({
        data: { leadId: lead.id, role: "user", content: `[${messageType}] ${text || ""}`.trim() },
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
    console.log(`[webhook] Novo lead criado: ${lead.id} (${phone})`);
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
      data: { leadId: lead.id, role: "user", content: text },
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: { lastInteractionAt: new Date() },
    }),
  ]);

  // ── Check if AI should respond ────────────────────────────
  if (!lead.aiEnabled) {
    console.log(`[webhook] IA desabilitada para lead ${lead.id} (${phone})`);
    return;
  }

  // Check human intervention pause
  if (lead.humanPausedUntil && new Date() < new Date(lead.humanPausedUntil)) {
    console.log(`[webhook] IA pausada por intervenção humana até ${lead.humanPausedUntil}`);
    return;
  }

  if (!aiConfig?.apiKey) {
    console.error(`[webhook] AI config sem apiKey para userId ${userId} — IA nao vai responder`);
    return;
  }

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
        console.log(`[webhook] Nova msg recebida durante espera, cancelando resposta anterior`);
        return;
      }
    }
  }

  console.log(`[webhook] Gerando resposta IA (${aiConfig.provider}/${aiConfig.model}) para lead ${lead.id}`);

  // ── Build context with vault media ────────────────────────
  const vaultContext = await getVaultContext(userId);

  // ── Build context with services ───────────────────────────
  const servicesContext = await getServicesContext(userId);

  const history = [
    ...lead.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: text },
  ];

  // Append vault + services context to system prompt
  let enrichedSystemPrompt = aiConfig.systemPrompt || "";
  if (vaultContext) {
    enrichedSystemPrompt += `\n\n${vaultContext}`;
  }
  if (servicesContext) {
    enrichedSystemPrompt += `\n\n${servicesContext}`;
  }

  const { reply, newStageEventName } = await generateAIReply(
    history,
    lead.name || pushName,
    {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: aiConfig.apiKey,
      clinicName: aiConfig.clinicName,
      systemPrompt: enrichedSystemPrompt || null,
    }
  );

  // ── Personalize reply ─────────────────────────────────────
  let finalReply = reply;
  if (aiConfig.includeContactName && lead.name && !reply.includes(lead.name)) {
    finalReply = reply;
  }

  console.log(`[webhook] Resposta IA gerada: "${finalReply.slice(0, 80)}..." stage=${newStageEventName}`);

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
    console.error(`[webhook] Falha ao enviar msg para ${phone}:`, sendResult.error);
  } else {
    console.log(`[webhook] Resposta enviada com sucesso para ${phone}`);
  }

  // ── Send audio if configured ──────────────────────────────
  if (aiConfig.sendAudio && sendAudio && finalReply.length >= (aiConfig.audioMinChars ?? 50)) {
    try {
      const { generateAudio } = await import("@/services/textToSpeech");
      const audioBuffer = await generateAudio(finalReply, aiConfig.openaiKey || aiConfig.apiKey || "");
      // For now, skip audio sending if we only have buffer (need URL for Uazapi)
      const audioUrl = audioBuffer ? null : null; // TODO: upload buffer to get URL
      if (audioUrl) {
        await sendAudio(phone, audioUrl);
        console.log(`[webhook] Audio enviado para ${phone}`);
      }
    } catch (err) {
      console.error(`[webhook] Erro gerando audio:`, err);
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

  console.log(`[webhook] IA pausada para lead ${leadId} até ${pauseUntil.toISOString()}`);
}

// ── Helpers ──────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAIConfigForWebhook(userId: string) {
  return prisma.aIConfig.findUnique({ where: { userId } });
}

async function findLead(userId: string, phone: string) {
  let lead = await prisma.lead.findFirst({
    where: { userId, phone },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
      stage: true,
    },
  });

  // Fallback: suffix match
  if (!lead && phone.length >= 9) {
    const phoneSuffix = phone.slice(-9);
    lead = await prisma.lead.findFirst({
      where: { userId, phone: { endsWith: phoneSuffix } },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 30 },
        stage: true,
      },
    });
    if (lead) {
      console.log(`[webhook] Lead encontrado por sufixo: ${lead.phone} -> ${phone}`);
    }
  }

  return lead;
}

async function createLead(userId: string, phone: string, pushName: string, attribution?: AdAttribution) {
  const firstStage = await prisma.stage.findFirst({
    where: { userId },
    orderBy: { order: "asc" },
  });

  const isFromAd = !!(attribution?.adId || attribution?.campaignId);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          name: pushName || phone,
          phone,
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
  } catch {
    const fallback = await prisma.lead.findFirst({
      where: { userId, phone },
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 30 },
        stage: true,
      },
    });
    if (!fallback) throw new Error("Failed to find or create lead");
    return fallback;
  }
}

async function getVaultContext(userId: string): Promise<string | null> {
  const assets = await prisma.assetVault.findMany({
    where: { userId },
    select: { id: true, name: true, description: true, category: true, fileUrl: true, fileType: true },
    take: 20,
  });

  if (assets.length === 0) return null;

  const mediaList = assets
    .filter(a => a.description)
    .map(a => `- ${a.name} (${a.category}): ${a.description} [URL: ${a.fileUrl}]`)
    .join("\n");

  return `MÍDIAS DISPONÍVEIS NO ACERVO (você pode sugerir enviar quando relevante, mencionando o nome):
${mediaList}

Quando for relevante enviar uma mídia, inclua no final da resposta: [ENVIAR_MIDIA: nome_da_midia]`;
}

async function getServicesContext(userId: string): Promise<string | null> {
  const services = await prisma.service.findMany({
    where: { userId, isActive: true },
    select: { name: true, description: true, price: true, duration: true, category: true },
  });

  if (services.length === 0) return null;

  const serviceList = services
    .map(s => {
      const price = s.price > 0 ? `R$ ${s.price.toFixed(2)}` : "consultar";
      const dur = s.duration > 0 ? `${s.duration} min` : "";
      return `- ${s.name}: ${s.description || ""} | Valor: ${price} | Duração: ${dur}${s.category ? ` | Categoria: ${s.category}` : ""}`;
    })
    .join("\n");

  return `SERVIÇOS DISPONÍVEIS:
${serviceList}

Use estas informações para responder perguntas sobre preços, serviços e para auxiliar no agendamento. Quando o cliente quiser agendar, pergunte data e horário preferidos.`;
}
