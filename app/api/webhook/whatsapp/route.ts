import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/services/whatsappService";
import { processIncomingMessage } from "@/services/webhookProcessor";

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

type MetaPayload = { object: string; entry: MetaEntry[] };

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
    if (config) return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
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

        const whatsappConfig = await prisma.whatsAppConfig.findFirst({
          where: { phoneNumberId },
        });
        if (!whatsappConfig) continue;

        for (const msg of messages) {
          if (msg.type !== "text" || !msg.text?.body?.trim()) continue;

          const referral = msg.referral;

          try {
            await processIncomingMessage({
              userId: whatsappConfig.userId,
              phone: msg.from,
              text: msg.text.body.trim(),
              pushName: value.contacts?.[0]?.profile?.name ?? "",
              attribution: referral
                ? {
                    adId: referral.ad_id,
                    adSetId: referral.ads_context_metadata?.adset_id,
                    campaignId: referral.ads_context_metadata?.campaign_id,
                    adName: referral.ads_context_metadata?.ad_title,
                    campaignName: referral.headline,
                  }
                : undefined,
              sendReply: (phone, text) =>
                sendMessage(whatsappConfig, phone, text),
            });
          } catch (err) {
            console.error(`[webhook] Erro processando msg ${msg.id}:`, err);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp webhook] Erro no parse:", err);
    return NextResponse.json({ ok: true });
  }
}
