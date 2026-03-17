import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendWhatsAppMessage } from "@/services/whatsappCloud";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";

// Meta WhatsApp Cloud API webhook payload
type MetaEntry = {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: {
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
        referral?: {
          source_url?: string;
          source_type?: string;
          source_id?: string;
          headline?: string;
          body?: string;
          ad_id?: string;
          ads_context_metadata?: {
            ad_title?: string;
            adset_id?: string;
            campaign_id?: string;
          };
        };
      }[];
    };
    field: string;
  }[];
};

type MetaPayload = {
  object: string;
  entry: MetaEntry[];
};

// GET — webhook verification by Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe") {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { verifyToken: token ?? "" },
    });

    if (config) {
      return new Response(challenge, { status: 200 });
    }
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  // Always return 200 to Meta — returning 500 causes infinite retry storm
  try {
    const body = (await req.json()) as MetaPayload;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value.metadata.phone_number_id;
        const messages = value.messages;
        if (!messages?.length) continue;

        // Find which user owns this phone number
        const whatsappConfig = await prisma.whatsAppConfig.findFirst({
          where: { phoneNumberId },
          include: { user: true },
        });
        if (!whatsappConfig) continue;

        for (const msg of messages) {
          if (msg.type !== "text" || !msg.text?.body?.trim()) continue;

          const text = msg.text.body.trim();
          const phone = msg.from;
          const pushName = value.contacts?.[0]?.profile?.name ?? "";

          // Extract Meta Ads referral data (Click-to-WhatsApp ads)
          const referral = msg.referral ?? undefined;

          try {
            await processMessage(whatsappConfig, msg.id, phone, text, pushName, referral);
          } catch (err) {
            console.error(`[webhook] Erro processando msg ${msg.id}:`, err);
            // Continue processing other messages even if one fails
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp webhook] Erro no parse:", err);
    // Return 200 even on error to prevent Meta retry storm
    return NextResponse.json({ ok: true });
  }
}

type ReferralData = {
  source_url?: string;
  source_type?: string;
  source_id?: string;
  headline?: string;
  body?: string;
  ad_id?: string;
  ads_context_metadata?: {
    ad_title?: string;
    adset_id?: string;
    campaign_id?: string;
  };
};

async function processMessage(
  whatsappConfig: { userId: string; phoneNumberId: string; accessToken: string },
  metaMsgId: string,
  phone: string,
  text: string,
  pushName: string,
  referral?: ReferralData,
) {
  // Deduplication: check if we already processed this Meta message ID
  const phoneSuffix = phone.slice(-9);
  const existingMsg = await prisma.message.findFirst({
    where: {
      content: text,
      role: "user",
      lead: {
        userId: whatsappConfig.userId,
        phone: { endsWith: phoneSuffix },
      },
      createdAt: { gte: new Date(Date.now() - 60_000) }, // within last 60s
    },
  });
  if (existingMsg) return; // Already processed, skip duplicate

  // Find or create lead (upsert-like to avoid race conditions)
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

    try {
      const isFromAd = !!referral?.ad_id;
      const created = await prisma.lead.create({
        data: {
          name: pushName || phone,
          phone,
          userId: whatsappConfig.userId,
          stageId: firstStage?.id ?? null,
          source: isFromAd ? "meta" : "whatsapp",
          platform: "whatsapp",
          medium: isFromAd ? "cpc" : "organic",
          metaAdId: referral?.ad_id ?? null,
          metaAdSetId: referral?.ads_context_metadata?.adset_id ?? null,
          metaCampaignId: referral?.ads_context_metadata?.campaign_id ?? null,
          adName: referral?.ads_context_metadata?.ad_title ?? null,
          campaign: referral?.headline ?? null,
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
      // Race condition: another webhook already created this lead
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

  // If lead came from a Meta ad and doesn't have ad IDs yet, update them
  if (referral?.ad_id && !lead.metaAdId) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        source: "meta",
        medium: "cpc",
        metaAdId: referral.ad_id,
        metaAdSetId: referral.ads_context_metadata?.adset_id ?? null,
        metaCampaignId: referral.ads_context_metadata?.campaign_id ?? null,
        adName: referral.ads_context_metadata?.ad_title ?? lead.adName,
        campaign: referral.headline ?? lead.campaign,
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
    }
  );

  // Save AI reply
  await prisma.message.create({
    data: { leadId: lead.id, role: "assistant", content: reply },
  });

  // Send reply via WhatsApp Cloud API
  const sendResult = await sendWhatsAppMessage(
    whatsappConfig.phoneNumberId,
    whatsappConfig.accessToken,
    phone,
    reply
  );

  if (!sendResult.success) {
    console.error(`[webhook] Falha ao enviar msg para ${phone}:`, sendResult.error);
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
