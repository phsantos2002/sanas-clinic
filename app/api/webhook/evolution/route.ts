import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { processIncomingMessage } from "@/services/webhookProcessor";
import { logWebhook } from "@/app/api/debug/webhook-log/route";
import { logger } from "@/lib/logger";
import { webhookQueue } from "@/lib/queue";
import { uazapiPayloadSchema } from "@/lib/uazapi/schemas";
import { enqueueWebhookDLQ } from "@/lib/uazapi/dlq";
import { maskPhone } from "@/lib/phone";

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

// Uazapi sends `content` as a string for plain text, but as an object for
// media messages (image/audio/video/location/document/contact/etc). Coerce
// to a safe string so `.trim()` and downstream text handling don't blow up.
function coerceMessageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.caption === "string") return obj.caption;
    if (typeof obj.conversation === "string") return obj.conversation;
    if (typeof obj.body === "string") return obj.body;
    return "";
  }
  return String(value);
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
  instanceName?: string;
} | null {
  // Format 0: Evolution API v2 (Baileys) — event "messages.upsert"
  // { event, instance, data: { key: {remoteJid, fromMe, id}, pushName, message: {...} } }
  if (payload.event === "messages.upsert" && payload.data?.key) {
    const data = payload.data;
    const remoteJid: string = data.key.remoteJid || "";
    const msg = data.message ?? {};
    const text = (
      coerceMessageText(msg.conversation) ||
      coerceMessageText(msg.extendedTextMessage?.text) ||
      coerceMessageText(msg.imageMessage?.caption) ||
      coerceMessageText(msg.videoMessage?.caption)
    ).trim();
    return {
      text,
      fromMe: data.key.fromMe === true,
      chatId: remoteJid,
      senderName: data.pushName || "",
      isGroup: remoteJid.endsWith("@g.us"),
      token: payload.apikey || "",
      wasSentByApi: false, // Evolution não distingue; fromMe já cobre os envios do app
      messageId: data.key.id || undefined,
      instanceName: payload.instance || "",
    };
  }

  // Format 1: New Uazapi format (EventType + message object)
  if (payload.message && payload.chat) {
    const msg = payload.message;
    const chat = payload.chat;
    const text = (coerceMessageText(msg.content) || coerceMessageText(msg.text)).trim();
    return {
      text,
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
      text: coerceMessageText(payload.body).trim(),
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
      // Bad JSON: still 200 (Uazapi will not retry) but DLQ for inspection
      await enqueueWebhookDLQ({
        source: "uazapi",
        rawPayload: { raw: raw.slice(0, 2000) },
        error: "JSON parse error",
      });
      return NextResponse.json({ ok: true });
    }

    // Validate payload shape via Zod (lenient: passthrough unknown fields)
    const parsed = uazapiPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      log.warn("uazapi_payload_invalid_shape", {
        issues: parsed.error.issues.slice(0, 3),
      });
      // Don't DLQ shape errors yet — fall through to extractMessageData which is more lenient.
      // Only DLQ if we can't even extract message data below.
    }

    const msgData = extractMessageData(payload);

    if (!msgData) {
      log.debug("uazapi_unrecognized_payload", { eventType: payload.EventType });
      // If we couldn't extract AND the shape was invalid, DLQ for review
      if (!parsed.success) {
        await enqueueWebhookDLQ({
          source: "uazapi",
          rawPayload: payload,
          error: `Invalid payload shape: ${parsed.error.issues[0]?.message ?? "unknown"}`,
        });
      }
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

    // Resolve a origem: WhatsAppConnection (multi-conexão) por instanceName,
    // com fallback no WhatsAppConfig legado (nome → token).
    const instanceToken = msgData.token;
    const instanceName = msgData.instanceName || payload.instanceName || "";
    const unofficialProviders = ["uazapi", "evolution"];

    let resolved: {
      userId: string;
      connectionId: string | null;
      sendConfig: {
        provider: string;
        phoneNumberId: string;
        accessToken: string;
        uazapiServerUrl: string | null;
        uazapiInstanceToken: string | null;
        uazapiInstanceName?: string | null;
      };
    } | null = null;

    if (instanceName) {
      const { resolveConnectionByInstanceName, connectionToSendConfig } = await import(
        "@/services/connections"
      );
      const conn = await resolveConnectionByInstanceName(instanceName);
      if (conn && conn.isActive) {
        resolved = {
          userId: conn.userId,
          connectionId: conn.id,
          sendConfig: connectionToSendConfig(conn),
        };
      }
    }

    if (!resolved) {
      let whatsappConfig = instanceName
        ? await prisma.whatsAppConfig.findFirst({
            where: { provider: { in: unofficialProviders }, uazapiInstanceName: instanceName },
          })
        : null;
      if (!whatsappConfig && instanceToken) {
        whatsappConfig = await prisma.whatsAppConfig.findFirst({
          where: { provider: { in: unofficialProviders }, uazapiInstanceToken: instanceToken },
        });
      }
      if (whatsappConfig) {
        resolved = { userId: whatsappConfig.userId, connectionId: null, sendConfig: whatsappConfig };
      }
    }

    if (!resolved) {
      log.error("uazapi_config_not_found", {
        tokenPrefix: instanceToken?.slice(0, 8),
        instanceName,
      });
      return NextResponse.json({ ok: true });
    }

    log.info("uazapi_processing", { userId: resolved.userId, connectionId: resolved.connectionId });

    // Resolve tracking code attribution
    const refCode = extractRefCode(msgData.text);
    let attribution:
      | {
          adId?: string | null;
          adSetId?: string | null;
          campaignId?: string | null;
          adName?: string | null;
          adSetName?: string | null;
          campaignName?: string | null;
        }
      | undefined;

    if (refCode) {
      const tracking = await prisma.adTrackingCode.findFirst({
        where: { code: refCode, userId: resolved.userId },
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

    // Return 200 to Uazapi immediately; keep the serverless invocation alive
    // with `after()` so the queued work (AI reply pipeline, which can take
    // 5-10s with delays) actually runs to completion instead of being killed
    // when the response is flushed. Without this, in-memory jobs vanish on
    // Vercel cold-stops and messages are silently dropped.
    const captured = resolved;
    after(async () => {
      try {
        const result = await webhookQueue.enqueue(() =>
          processIncomingMessage({
            userId: captured.userId,
            phone,
            text: msgData!.text,
            pushName: msgData!.senderName,
            attribution,
            externalMessageId: msgData!.messageId,
            connectionId: captured.connectionId ?? undefined,
            sendReply: async (replyPhone, replyText) => {
              // Responde pela MESMA conexão que recebeu a mensagem.
              const { sendMessage } = await import("@/services/whatsappService");
              return sendMessage(captured.sendConfig, replyPhone, replyText);
            },
          })
        );
        if (!result.success) {
          await enqueueWebhookDLQ({
            source: "uazapi",
            rawPayload: payload,
            error: result.error,
            userId: captured.userId,
            phone: maskPhone(phone),
          });
        }
      } catch (err) {
        log.error("uazapi_queue_error", { err });
        await enqueueWebhookDLQ({
          source: "uazapi",
          rawPayload: payload,
          error: err,
          userId: captured.userId,
          phone: maskPhone(phone),
        }).catch(() => {});
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("uazapi_general_error", { err });
    // General handler error — DLQ raw text for postmortem
    enqueueWebhookDLQ({
      source: "uazapi",
      rawPayload: { error: "general_handler_error" },
      error: err,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  }
}
