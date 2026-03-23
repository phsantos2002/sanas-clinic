import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendUazapiMessage } from "@/services/whatsappUazapi";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";

/**
 * Uazapi Webhook — receives messages from Uazapi instances.
 *
 * With addUrlEvents: true, Uazapi appends the event to the URL:
 *   POST /api/webhook/evolution/messages
 *   POST /api/webhook/evolution/connection
 *
 * But we also handle the base URL for compatibility.
 *
 * Message payload format:
 * {
 *   "event": "messages",
 *   "instancetoken": "...",
 *   "id": "3EB0...",
 *   "fromMe": false,
 *   "chatid": "5511999999999@s.whatsapp.net",
 *   "senderName": "João",
 *   "body": "Olá!",
 *   "type": "conversation",
 *   "timestamp": 1234567890
 * }
 */

type UazapiPayload = {
  event?: string;
  instancetoken?: string;
  id?: string;
  fromMe?: boolean;
  chatid?: string;
  senderName?: string;
  body?: string;
  type?: string;
  timestamp?: number;
};

// Extract REF-XXXXX tracking code from message text
const REF_CODE_REGEX = /\bREF-([A-Z0-9]{6,})\b/i;

function extractRefCode(text: string): string | null {
  const match = text.match(REF_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function extractPhoneFromChatId(chatId: string): string {
  // "5511999999999@s.whatsapp.net" → "5511999999999"
  return chatId.split("@")[0].replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UazapiPayload;

    // Only process incoming messages (not sent by us)
    if (body.fromMe || !body.body?.trim() || !body.chatid) {
      return NextResponse.json({ ok: true });
    }

    // Skip group messages
    if (body.chatid.includes("@g.us")) {
      return NextResponse.json({ ok: true });
    }

    const instanceToken = body.instancetoken;
    const text = body.body.trim();
    const phone = extractPhoneFromChatId(body.chatid);
    if (!phone) return NextResponse.json({ ok: true });

    // Find which user owns this Uazapi instance
    const whatsappConfig = await prisma.whatsAppConfig.findFirst({
      where: {
        provider: "uazapi",
        uazapiInstanceToken: instanceToken,
      },
    });
    if (!whatsappConfig) {
      console.error(`[uazapi webhook] Instance not found for token: ${instanceToken?.slice(0, 8)}...`);
      return NextResponse.json({ ok: true });
    }

    const pushName = body.senderName ?? "";
    const msgId = body.id ?? "";

    try {
      await processUazapiMessage(whatsappConfig, msgId, phone, text, pushName);
    } catch (err) {
      console.error(`[uazapi webhook] Erro processando msg ${msgId}:`, err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[uazapi webhook] Erro no parse:", err);
    return NextResponse.json({ ok: true });
  }
}

async function processUazapiMessage(
  whatsappConfig: {
    userId: string;
    uazapiServerUrl: string | null;
    uazapiInstanceToken: string | null;
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

  // Send reply via Uazapi
  if (whatsappConfig.uazapiServerUrl && whatsappConfig.uazapiInstanceToken) {
    const sendResult = await sendUazapiMessage(
      whatsappConfig.uazapiServerUrl,
      whatsappConfig.uazapiInstanceToken,
      phone,
      reply,
    );

    if (!sendResult.success) {
      console.error(`[uazapi webhook] Falha ao enviar msg para ${phone}:`, sendResult.error);
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
