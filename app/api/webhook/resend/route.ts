import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logLeadActivity } from "@/services/leadActivity";

/**
 * Resend Webhook Receiver
 *
 * Eventos suportados (docs: resend.com/docs/dashboard/webhooks):
 *   email.sent          — entregue à Resend para envio
 *   email.delivered     — entregue ao servidor destinatário
 *   email.delivery_delayed
 *   email.bounced       — rejeitado (hard/soft)
 *   email.complained    — marcado como spam
 *   email.opened        — destinatário abriu (alternativa ao pixel)
 *   email.clicked       — clicou em link (forte sinal de interesse)
 *
 * Config no painel Resend: endpoint URL + secret (Svix).
 * Secret -> RESEND_WEBHOOK_SECRET. Se ausente, aceita sem validação (dev).
 */

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    subject?: string;
    to?: string[];
    created_at?: string;
  };
};

async function verifyWebhook(req: Request, rawBody: string): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true; // dev / não configurado — aceita

  const signature = req.headers.get("svix-signature") || "";
  const svixId = req.headers.get("svix-id") || "";
  const svixTimestamp = req.headers.get("svix-timestamp") || "";
  if (!signature || !svixId || !svixTimestamp) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const secretBytes = Buffer.from(secret.split("_")[1] || secret, "base64");
  const expectedSig = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  return signature.split(" ").some((s) => s.split(",")[1] === expectedSig);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const ok = await verifyWebhook(req, rawBody);
  if (!ok) {
    logger.warn("resend_webhook_invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const providerId = event.data?.email_id;
  if (!providerId) {
    return NextResponse.json({ ok: true, skipped: "no email_id" });
  }

  // Localiza o EmailTracking pelo providerId
  const tracking = await prisma.emailTracking.findFirst({
    where: { providerId },
    include: {
      user: { select: { id: true } },
    },
  });

  if (!tracking) {
    return NextResponse.json({ ok: true, skipped: "tracking not found" });
  }

  const now = new Date();

  switch (event.type) {
    case "email.delivered":
      await prisma.emailTracking.update({
        where: { id: tracking.id },
        data: { status: tracking.status === "opened" ? "opened" : "sent" },
      });
      break;

    case "email.opened":
      await prisma.emailTracking.update({
        where: { id: tracking.id },
        data: {
          status: "opened",
          openedAt: tracking.openedAt ?? now,
          openCount: { increment: 1 },
        },
      });
      await logLeadActivity({
        leadId: tracking.leadId,
        userId: tracking.userId,
        type: "email_opened",
        summary: `Email aberto: "${tracking.subject.slice(0, 60)}"`,
        metadata: { providerId, subject: tracking.subject },
      });
      break;

    case "email.clicked":
      await prisma.emailTracking.update({
        where: { id: tracking.id },
        data: { status: "clicked" },
      });
      await logLeadActivity({
        leadId: tracking.leadId,
        userId: tracking.userId,
        type: "email_opened",
        summary: `Link clicado no email: "${tracking.subject.slice(0, 60)}"`,
        metadata: { providerId, subject: tracking.subject, event: "clicked" },
      });
      // Click é forte sinal de engajamento — interrompe cadência outbound
      await prisma.workflowExecution.updateMany({
        where: {
          leadId: tracking.leadId,
          status: "running",
          workflow: { isSequence: true, stopOnReply: true, userId: tracking.userId },
        },
        data: { status: "stopped", completedAt: now },
      });
      await logLeadActivity({
        leadId: tracking.leadId,
        userId: tracking.userId,
        type: "cadence_stopped",
        summary: "Cadência interrompida — lead clicou no email",
        actorType: "system",
      });
      break;

    case "email.bounced":
    case "email.complained":
      await prisma.emailTracking.update({
        where: { id: tracking.id },
        data: {
          status: event.type === "email.bounced" ? "bounced" : "complained",
        },
      });
      break;

    default:
      // event ignored
      break;
  }

  return NextResponse.json({ ok: true, handled: event.type });
}
