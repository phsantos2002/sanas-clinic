import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUazapiMessage } from "@/services/whatsappUazapi";
import { processIncomingMessage } from "@/services/webhookProcessor";
import { logWebhook } from "@/app/api/debug/webhook-log/route";
import { logger } from "@/lib/logger";
import { webhookQueue } from "@/lib/queue";

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
  messageId?: string;
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
      messageId: msg.id || msg.messageId || undefined,
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
      messageId: payload.id || undefined,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  const log = logger.child({ route: "uazapi_webhook" });
  try {
    const raw = await req.text();
    log.debug("uazapi_raw_received", { length: raw.length });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;
    try {
      payload = JSON.parse(raw);
      logWebhook(payload);
    } catch {
      log.error("uazapi_json_parse_error");
      logWebhook({ error: "JSON parse error", raw: raw.slice(0, 500) });
      return NextResponse.json({ ok: true });
    }

    const msgData = extractMessageData(payload);

    if (!msgData) {
      log.debug("uazapi_unrecognized_payload", { eventType: payload.EventType });
      return NextResponse.json({ ok: true });
    }

    log.debug("uazapi_msg_extracted", {
      fromMe: msgData.fromMe,
      wasSentByApi: msgData.wasSentByApi,
      isGroup: msgData.isGroup,
      hasText: !!msgData.text,
      messageId: msgData.messageId,
    });

    // Skip: own messages, API-sent messages, empty text, group messages
    if (msgData.fromMe || msgData.wasSentByApi || !msgData.text || msgData.isGroup) {
      log.debug("uazapi_msg_skipped", {
        fromMe: msgData.fromMe,
        wasSentByApi: msgData.wasSentByApi,
        isGroup: msgData.isGroup,
        empty: !msgData.text,
      });
      return NextResponse.json({ ok: true });
    }

    const phone = extractPhoneFromChatId(msgData.chatId);
    if (!phone) {
      log.warn("uazapi_no_phone_from_chatid", { chatId: msgData.chatId });
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
      log.error("uazapi_config_not_found", { tokenPrefix: instanceToken?.slice(0, 8), instanceName });
      return NextResponse.json({ ok: true });
    }

    log.info("uazapi_processing", { userId: whatsappConfig.userId });

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

    // Sprint 3: enqueue for async processing — returns 200 immediately
    const capturedConfig = whatsappConfig;
    webhookQueue.enqueue(() =>
      processIncomingMessage({
        userId: capturedConfig.userId,
        phone,
        text: msgData!.text,
        pushName: msgData!.senderName,
        attribution,
        externalMessageId: msgData!.messageId,
        sendReply: async (replyPhone, replyText) => {
          if (capturedConfig.uazapiServerUrl && capturedConfig.uazapiInstanceToken) {
            const res = await sendUazapiMessage(
              capturedConfig.uazapiServerUrl!,
              capturedConfig.uazapiInstanceToken!,
              replyPhone,
              replyText,
            );
            return { success: res.ok, error: res.ok ? undefined : res.error };
          }
          return { success: false, error: "Uazapi nao configurado" };
        },
      })
    ).catch((err) => log.error("uazapi_queue_error", { err }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("uazapi_general_error", { err });
    return NextResponse.json({ ok: true });
  }
}
