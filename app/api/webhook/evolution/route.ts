import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUazapiMessage } from "@/services/whatsappUazapi";
import { processIncomingMessage } from "@/services/webhookProcessor";
import { logWebhook } from "@/app/api/debug/webhook-log/route";

/**
 * Uazapi Webhook Handler
 *
 * Real payload format from Uazapi:
 * {
 *   "BaseUrl": "https://sanas.uazapi.com",
 *   "EventType": "messages",
 *   "chat": { "wa_chatid": "5511999999999@s.whatsapp.net", "wa_contactName": "Nome", ... },
 *   "message": {
 *     "content": "Oi",
 *     "fromMe": false,
 *     "chatId": "5511999999999@s.whatsapp.net",
 *     "messageTimestamp": 1234567890,
 *     "messageType": "Conversation",
 *     "sender": "5511999999999@s.whatsapp.net",
 *     "senderName": "Nome",
 *     "wasSentByApi": false,
 *     ...
 *   },
 *   "instanceName": "sanas-xxx",
 *   "token": "xxx"
 * }
 */

// Extract REF-XXXXX tracking code from message text
const REF_CODE_REGEX = /\bREF-([A-Z0-9]{6,})\b/i;

function extractRefCode(text: string): string | null {
  const match = text.match(REF_CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function extractPhoneFromChatId(chatId: string): string {
  return chatId.split("@")[0].replace(/\D/g, "");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessageData(payload: any): {
  text: string;
  fromMe: boolean;
  chatId: string;
  senderName: string;
  isGroup: boolean;
  token: string;
  wasSentByApi: boolean;
} | null {
  // Format 1: New Uazapi format (EventType + message object)
  if (payload.message && payload.chat) {
    const msg = payload.message;
    const chat = payload.chat;
    return {
      text: (msg.content || msg.text || "").trim(),
      fromMe: msg.fromMe === true,
      chatId: msg.chatId || chat.wa_chatid || "",
      senderName: msg.senderName || chat.wa_contactName || "",
      isGroup: msg.isGroup === true || chat.wa_isGroup === true,
      token: payload.token || "",
      wasSentByApi: msg.wasSentByApi === true,
    };
  }

  // Format 2: Old Uazapi format (flat structure)
  if (payload.body && payload.chatid) {
    return {
      text: (payload.body || "").trim(),
      fromMe: payload.fromMe === true,
      chatId: payload.chatid || "",
      senderName: payload.senderName || "",
      isGroup: (payload.chatid || "").includes("@g.us"),
      token: payload.instancetoken || payload.token || "",
      wasSentByApi: false,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    console.log(`[uazapi webhook RAW] ${raw.slice(0, 500)}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;
    try {
      payload = JSON.parse(raw);
      logWebhook(payload);
    } catch {
      console.error("[uazapi webhook] JSON parse error");
      logWebhook({ error: "JSON parse error", raw: raw.slice(0, 500) });
      return NextResponse.json({ ok: true });
    }

    const msgData = extractMessageData(payload);

    if (!msgData) {
      console.log(`[uazapi webhook] Payload nao reconhecido, EventType=${payload.EventType}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`[uazapi webhook] fromMe=${msgData.fromMe} wasSentByApi=${msgData.wasSentByApi} isGroup=${msgData.isGroup} chatId=${msgData.chatId?.slice(0, 20)} text="${msgData.text.slice(0, 30)}"`);

    // Skip: own messages, API-sent messages, empty text, group messages
    if (msgData.fromMe || msgData.wasSentByApi || !msgData.text || msgData.isGroup) {
      console.log(`[uazapi webhook] Skipped: fromMe=${msgData.fromMe} wasSentByApi=${msgData.wasSentByApi} isGroup=${msgData.isGroup} empty=${!msgData.text}`);
      return NextResponse.json({ ok: true });
    }

    const phone = extractPhoneFromChatId(msgData.chatId);
    if (!phone) {
      console.log("[uazapi webhook] No phone extracted from chatId");
      return NextResponse.json({ ok: true });
    }

    // Find WhatsApp config by token or instance name
    const instanceToken = msgData.token;
    const instanceName = payload.instanceName || "";

    let whatsappConfig = instanceToken
      ? await prisma.whatsAppConfig.findFirst({
          where: { provider: "uazapi", uazapiInstanceToken: instanceToken },
        })
      : null;

    // Fallback: find by instance name
    if (!whatsappConfig && instanceName) {
      whatsappConfig = await prisma.whatsAppConfig.findFirst({
        where: { provider: "uazapi", uazapiInstanceName: instanceName },
      });
    }

    if (!whatsappConfig) {
      console.error(`[uazapi webhook] Config not found for token=${instanceToken?.slice(0, 8)} name=${instanceName}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`[uazapi webhook] Config found for userId=${whatsappConfig.userId}, processing...`);

    // Resolve tracking code attribution
    const refCode = extractRefCode(msgData.text);
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
        text: msgData.text,
        pushName: msgData.senderName,
        attribution,
        sendReply: async (replyPhone, replyText) => {
          if (whatsappConfig!.uazapiServerUrl && whatsappConfig!.uazapiInstanceToken) {
            const res = await sendUazapiMessage(
              whatsappConfig!.uazapiServerUrl!,
              whatsappConfig!.uazapiInstanceToken!,
              replyPhone,
              replyText,
            );
            return { success: res.ok, error: res.ok ? undefined : res.error };
          }
          return { success: false, error: "Uazapi nao configurado" };
        },
      });
    } catch (err) {
      console.error(`[uazapi webhook] Erro processando msg:`, err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[uazapi webhook] Erro geral:", err);
    return NextResponse.json({ ok: true });
  }
}
