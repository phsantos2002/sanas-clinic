import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { webhookQueue } from "@/lib/queue";
import { MetaWebhookPayloadSchema } from "@/lib/schemas/webhook";
import { sendMessage } from "@/services/whatsappService";
import { processIncomingMessage } from "@/services/webhookProcessor";

// ─── HMAC Verification ───────────────────────────────────────────────────────
// Per-user App Secret (stored in WhatsAppConfig.metaAppSecret) takes priority
// over the global META_APP_SECRET env var. Falls back to env var when the user
// hasn't configured their own secret yet, so zero downtime during rollout.

function verifySignatureWithSecret(rawBody: string, signature: string, appSecret: string): boolean {
  const [algo, hash] = signature.split("=");
  if (algo !== "sha256" || !hash) return false;

  const expectedHash = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
  } catch {
    return false;
  }
}

async function verifyMetaSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;

  // Attempt to extract phoneNumberId from the raw body so we can look up the
  // per-user App Secret without doing a full Zod parse (which we want after auth).
  let phoneNumberId: string | undefined;
  try {
    const parsed = JSON.parse(rawBody);
    phoneNumberId = parsed?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  } catch {
    // Invalid JSON — keep phoneNumberId undefined; will fall back to env var
  }

  // Look up per-user App Secret when we have a phoneNumberId
  if (phoneNumberId) {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { phoneNumberId },
      select: { metaAppSecret: true },
    });

    if (config?.metaAppSecret) {
      return verifySignatureWithSecret(rawBody, signature, config.metaAppSecret);
    }
  }

  // Fallback: global env var (covers accounts not yet migrated to per-user secret)
  const globalSecret = process.env.META_APP_SECRET;
  if (!globalSecret) {
    logger.warn("meta_webhook_missing_secret", {
      msg: "Nenhum App Secret configurado (nem no banco nem em META_APP_SECRET) — verificação desabilitada",
    });
    return true; // Open-fail in dev; warn in production
  }

  return verifySignatureWithSecret(rawBody, signature, globalSecret);
}

// ─── GET — Verificação do webhook pelo Meta ───────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe") {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { verifyToken: token ?? "" },
    });
    if (config) return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// ─── POST — Recebimento de mensagens ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const log = logger.child({ webhook: "meta-whatsapp" });

  // Ler body como texto para verificar HMAC antes de parsear
  const rawBody = await req.text();

  const valid = await verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"));
  if (!valid) {
    log.warn("meta_webhook_invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Sprint 5: parse + validate with Zod schema (replaces manual TypeScript types)
  const parsed = MetaWebhookPayloadSchema.safeParse(
    (() => { try { return JSON.parse(rawBody); } catch { return null; } })()
  );

  if (!parsed.success) {
    log.warn("meta_webhook_invalid_payload", { issues: parsed.error.issues.slice(0, 3) });
    return NextResponse.json({ ok: true }); // Meta espera 200 mesmo em erros
  }

  const body = parsed.data;
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ ok: true });
  }

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value         = change.value;
      const phoneNumberId = value.metadata.phone_number_id;
      const messages      = value.messages;
      if (!messages?.length) continue;

      const whatsappConfig = await prisma.whatsAppConfig.findFirst({
        where: { phoneNumberId },
      });
      if (!whatsappConfig) continue;

      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body?.trim()) continue;

        const referral = msg.referral;
        const capturedConfig = whatsappConfig;
        const capturedContacts = value.contacts;

        // Sprint 3: enqueue for async processing — caller gets 200 immediately
        webhookQueue.enqueue(() =>
          processIncomingMessage({
            userId:            capturedConfig.userId,
            phone:             msg.from,
            text:              msg.text!.body.trim(),
            pushName:          capturedContacts?.[0]?.profile?.name ?? "",
            externalMessageId: msg.id,
            attribution: referral
              ? {
                  adId:         referral.ad_id,
                  adSetId:      referral.ads_context_metadata?.adset_id,
                  campaignId:   referral.ads_context_metadata?.campaign_id,
                  adName:       referral.ads_context_metadata?.ad_title,
                  campaignName: referral.headline,
                }
              : undefined,
            sendReply: (phone, text) => sendMessage(capturedConfig, phone, text),
          })
        ).catch((err) => log.error("meta_webhook_queue_error", { msgId: msg.id, err }));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
