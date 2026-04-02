import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUazapiMessage } from "@/services/whatsappUazapi";
import { processIncomingMessage } from "@/services/webhookProcessor";

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
  return chatId.split("@")[0].replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UazapiPayload;

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

    // Resolve tracking code attribution
    const refCode = extractRefCode(text);
    let attribution: {
      adId?: string | null;
      adSetId?: string | null;
      campaignId?: string | null;
      adName?: string | null;
      adSetName?: string | null;
      campaignName?: string | null;
    } | undefined;

    if (refCode) {
      const tracking = await prisma.adTrackingCode.findFirst({
        where: { code: refCode, userId: whatsappConfig.userId },
      });
      if (tracking) {
        attribution = {
          adId: tracking.adId,
          adSetId: tracking.adSetId,
          campaignId: tracking.campaignId,
          adName: tracking.adName,
          adSetName: tracking.adSetName,
          campaignName: tracking.campaignName,
        };
      }
    }

    try {
      await processIncomingMessage({
        userId: whatsappConfig.userId,
        phone,
        text,
        pushName: body.senderName ?? "",
        attribution,
        sendReply: async (replyPhone, replyText) => {
          if (whatsappConfig.uazapiServerUrl && whatsappConfig.uazapiInstanceToken) {
            const res = await sendUazapiMessage(
              whatsappConfig.uazapiServerUrl,
              whatsappConfig.uazapiInstanceToken,
              replyPhone,
              replyText,
            );
            return { success: res.ok, error: res.ok ? undefined : res.error };
          }
          return { success: false, error: "Uazapi nao configurado" };
        },
      });
    } catch (err) {
      console.error(`[uazapi webhook] Erro processando msg ${body.id}:`, err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[uazapi webhook] Erro no parse:", err);
    return NextResponse.json({ ok: true });
  }
}
