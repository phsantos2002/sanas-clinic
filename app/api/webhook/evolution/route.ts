import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendWahaMessage } from "@/services/whatsappEvolution";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";

/**
 * WAHA Webhook — receives messages from WAHA sessions.
 *
 * Payload format ("message" event):
 * {
 *   event: "message",
 *   session: "lux-abc12345",
 *   payload: {
 *     id: "...",
 *     from: "5511999999999@c.us",
 *     fromMe: false,
 *     body: "Olá!",
 *     timestamp: 1234567890,
 *     hasMedia: false,
 *     _data: { notifyName: "João" }
 *   }
 * }
 */

type WahaPayload = {
  event: string;
  session: string;
  payload: {
    id: string;
    from: string;
    fromMe: boolean;
    body: string;
    timestamp: number;
    hasMedia: boolean;
    _data?: {
      notifyName?: string;
    };
  };
};

// Extract REF-XXXXX tracking code from message text
const REF_CODE_REGEX = /\bREF-([A-Z0-9]{6,})\b/i;

function extractRefCode(text: string): string | null {
  const match = text.match(REF_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function extractPhoneFromChatId(chatId: string): string {
  // "5511999999999@c.us" → "5511999999999"
  return chatId.split("@")[0].replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WahaPayload;

    // Only process incoming messages (not sent by us)
    if (body.event !== "message" || body.payload?.fromMe) {
      return NextResponse.json({ ok: true });
    }

    const sessionName = body.session;
    const text = body.payload?.body?.trim();
    if (!text) return NextResponse.json({ ok: true });

    const phone = extractPhoneFromChatId(body.payload.from);
    if (!phone) return NextResponse.json({ ok: true });

    // Find which user owns this WAHA session
    const whatsappConfig = await prisma.whatsAppConfig.findFirst({
      where: {
        provider: "waha",
        wahaSessionName: sessionName,
      },
    });
    if (!whatsappConfig) {
      console.error(`[waha webhook] Sessão não encontrada: ${sessionName}`);
      return NextResponse.json({ ok: true });
    }

    const pushName = body.payload._data?.notifyName ?? "";
    const msgId = body.payload.id;

    try {
      await processWahaMessage(whatsappConfig, msgId, phone, text, pushName);
    } catch (err) {
      console.error(`[waha webhook] Erro processando msg ${msgId}:`, err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waha webhook] Erro no parse:", err);
    return NextResponse.json({ ok: true });
  }
}

async function processWahaMessage(
  whatsappConfig: {
    userId: string;
    wahaServerUrl: string | null;
    wahaApiKey: string | null;
    wahaSessionName: string | null;
  },
  msgId: string,
  phone: string,
  text: string,
  pushName: string,
) {
  // Deduplication
  const phoneSuffix = phone.slice(-9);
  const existingMsg = await prisma.message.findFirst({
    where: {
      content: text,
      role: "user",
      lead: {
        userId: whatsappConfig.userId,
        phone: { endsWith: phoneSuffix },
      },
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (existingMsg) return;

  // Try to extract tracking code from message (REF-XXXXXX)
  const refCode = extractRefCode(text);
  let trackingData: {
    campaignId: string | null;
    campaignName: string | null;
    adSetId: string | null;
    adSetName: string | null;
    adId: string | null;
    adName: string | null;
  } | null = null;

  if (refCode) {
    const tracking = await prisma.adTrackingCode.findFirst({
      where: { code: refCode, userId: whatsappConfig.userId },
    });
    if (tracking) {
      trackingData = {
        campaignId: tracking.campaignId,
        campaignName: tracking.campaignName,
        adSetId: tracking.adSetId,
        adSetName: tracking.adSetName,
        adId: tracking.adId,
        adName: tracking.adName,
      };
    }
  }

  // Find or create lead
  let lead = await prisma.lead.findFirst({
    where: {
      userId: whatsappConfig.userId,
      phone: { endsWith: phoneSuffix },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      stage: true,
    },
  });

  if (!lead) {
    const firstStage = await prisma.stage.findFirst({
      where: { userId: whatsappConfig.userId },
      orderBy: { order: "asc" },
    });

    const isFromAd = !!trackingData;

    try {
      const created = await prisma.lead.create({
        data: {
          name: pushName || phone,
          phone,
          userId: whatsappConfig.userId,
          stageId: firstStage?.id ?? null,
          source: isFromAd ? "meta" : "whatsapp",
          platform: "whatsapp",
          medium: isFromAd ? "cpc" : "organic",
          metaAdId: trackingData?.adId ?? null,
          metaAdSetId: trackingData?.adSetId ?? null,
          metaCampaignId: trackingData?.campaignId ?? null,
          adName: trackingData?.adName ?? null,
          adSetName: trackingData?.adSetName ?? null,
          campaign: trackingData?.campaignName ?? null,
        },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          stage: true,
        },
      });

      if (firstStage) {
        await prisma.leadStageHistory.create({
          data: { leadId: created.id, stageId: firstStage.id },
        });
      }

      lead = created;
    } catch {
      lead = await prisma.lead.findFirst({
        where: {
          userId: whatsappConfig.userId,
          phone: { endsWith: phoneSuffix },
        },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          stage: true,
        },
      });
      if (!lead) throw new Error("Failed to find or create lead");
    }
  }

  // If lead exists but doesn't have tracking data yet, update from REF code
  if (trackingData && !lead.metaAdId) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        source: "meta",
        medium: "cpc",
        metaAdId: trackingData.adId,
        metaAdSetId: trackingData.adSetId,
        metaCampaignId: trackingData.campaignId,
        adName: trackingData.adName ?? lead.adName,
        adSetName: trackingData.adSetName ?? lead.adSetName,
        campaign: trackingData.campaignName ?? lead.campaign,
      },
    });
  }

  // Save incoming message
  await prisma.message.create({
    data: { leadId: lead.id, role: "user", content: text },
  });

  if (!lead.aiEnabled) return;

  // Load AI config
  const aiConfig = await getAIConfigByUserId(lead.userId);
  if (!aiConfig?.apiKey) return;

  // Build conversation history
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
    },
  );

  // Save AI reply
  await prisma.message.create({
    data: { leadId: lead.id, role: "assistant", content: reply },
  });

  // Send reply via WAHA
  if (whatsappConfig.wahaServerUrl && whatsappConfig.wahaApiKey && whatsappConfig.wahaSessionName) {
    const sendResult = await sendWahaMessage(
      {
        serverUrl: whatsappConfig.wahaServerUrl,
        apiKey: whatsappConfig.wahaApiKey,
        sessionName: whatsappConfig.wahaSessionName,
      },
      phone,
      reply,
    );

    if (!sendResult.success) {
      console.error(`[waha webhook] Falha ao enviar msg para ${phone}:`, sendResult.error);
    }
  }

  // Update stage if AI determined a new one
  if (newStageEventName && newStageEventName !== lead.stage?.eventName) {
    const newStage = await prisma.stage.findFirst({
      where: { userId: lead.userId, eventName: newStageEventName },
    });

    if (newStage) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { stageId: newStage.id },
      });
      await prisma.leadStageHistory.create({
        data: { leadId: lead.id, stageId: newStage.id },
      });
      await sendFacebookEvent({
        userId: lead.userId,
        phone: lead.phone,
        eventName: newStage.eventName,
        leadId: lead.id,
        stageName: newStage.name,
      });
    }
  }
}
