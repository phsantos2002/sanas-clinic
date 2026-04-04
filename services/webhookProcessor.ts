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

/**
 * Shared message processor for both WhatsApp Cloud API and Uazapi webhooks.
 * Handles: deduplication, lead upsert, AI reply, stage update, pixel events.
 */
export async function processIncomingMessage(params: {
  userId: string;
  phone: string;
  text: string;
  pushName: string;
  attribution?: AdAttribution;
  sendReply: SendFn;
}) {
  const { userId, phone, text, pushName, attribution, sendReply } = params;

  console.log(`[webhook] Processando msg de ${phone} para userId ${userId}: "${text.slice(0, 50)}"`);

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

  // ── Find or create lead ───────────────────────────────────
  let isNewLead = false;

  // Try exact match first, then suffix match for phone format variations
  let lead = await prisma.lead.findFirst({
    where: { userId, phone },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 30 },
      stage: true,
    },
  });

  // Fallback: try suffix match (last 9 digits) if exact match fails
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

  if (!lead) {
    const firstStage = await prisma.stage.findFirst({
      where: { userId },
      orderBy: { order: "asc" },
    });

    const isFromAd = !!(attribution?.adId || attribution?.campaignId);

    try {
      isNewLead = true;
      lead = await prisma.$transaction(async (tx) => {
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
      console.log(`[webhook] Novo lead criado: ${lead.id} (${phone})`);
    } catch (err) {
      console.error(`[webhook] Erro criando lead para ${phone}:`, err);
      // Race condition fallback
      lead = await prisma.lead.findFirst({
        where: { userId, phone },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 30 },
          stage: true,
        },
      });
      if (!lead) throw new Error("Failed to find or create lead");
    }
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

  if (!lead.aiEnabled) {
    console.log(`[webhook] IA desabilitada para lead ${lead.id} (${phone})`);
    return;
  }

  // ── Generate AI reply ─────────────────────────────────────
  const aiConfig = await getAIConfigByUserId(userId);
  if (!aiConfig?.apiKey) {
    console.error(`[webhook] AI config sem apiKey para userId ${userId} — IA nao vai responder`);
    return;
  }

  console.log(`[webhook] Gerando resposta IA (${aiConfig.provider}/${aiConfig.model}) para lead ${lead.id}`);

  const history = [
    ...lead.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: text },
  ];

  const { reply, newStageEventName } = await generateAIReply(
    history,
    lead.name || pushName,
    {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: aiConfig.apiKey,
      clinicName: aiConfig.clinicName,
      systemPrompt: aiConfig.systemPrompt,
    }
  );

  console.log(`[webhook] Resposta IA gerada: "${reply.slice(0, 80)}..." stage=${newStageEventName}`);

  // ── Save AI reply ─────────────────────────────────────────
  await prisma.message.create({
    data: { leadId: lead.id, role: "assistant", content: reply },
  });

  // ── Send reply ────────────────────────────────────────────
  const sendResult = await sendReply(phone, reply);
  if (!sendResult.success) {
    console.error(`[webhook] Falha ao enviar msg para ${phone}:`, sendResult.error);
  } else {
    console.log(`[webhook] Resposta enviada com sucesso para ${phone}`);
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

      // Fire stage_change workflow trigger
      fireTrigger(userId, "stage_change", lead.id, { stageId: newStage.id }).catch(() => {});
    }
  }
}
