import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

type Lead = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
};

type SendArgs = {
  userId: string;
  lead: Lead;
  subject: string;
  message: string;
  trackingId?: string;
};

type SendResult = { ok: true; providerId?: string } | { ok: false; error: string };

/**
 * Send a cadence email via Resend.
 * Tracking pixel is appended automatically if RESEND_API_KEY is configured.
 * Falls back to a soft error (ok:false) if Resend is not configured,
 * allowing the workflow engine to continue without crashing.
 */
export async function sendCadenceEmail(args: SendArgs): Promise<SendResult> {
  if (!args.lead.email) {
    return { ok: false, error: "Lead sem email" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("email_resend_not_configured", { userId: args.userId });
    return { ok: false, error: "Resend nao configurado (RESEND_API_KEY)" };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@sanaspulse.com.br";
  const fromName = process.env.RESEND_FROM_NAME || "Equipe Sanas Pulse";

  const aiConfig = await prisma.aIConfig.findUnique({ where: { userId: args.userId } });
  const clinicName = aiConfig?.clinicName || "nossa equipe";

  const renderTemplate = (t: string) =>
    t
      .replace(/\{\{nome\}\}/gi, args.lead.name.split(" ")[0])
      .replace(/\{\{nome_completo\}\}/gi, args.lead.name)
      .replace(/\{\{empresa\}\}/gi, args.lead.company || "sua empresa")
      .replace(/\{\{clinica\}\}/gi, clinicName);

  const subject = renderTemplate(args.subject);
  const messageText = renderTemplate(args.message);

  // Create tracking record
  const tracking = await prisma.emailTracking.create({
    data: {
      leadId: args.lead.id,
      userId: args.userId,
      subject,
      status: "queued",
    },
  }).catch(() => null);

  const trackingId = tracking?.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sanas-clinic-l235.vercel.app";
  const pixelUrl = trackingId ? `${appUrl}/api/email/open/${trackingId}` : null;

  const html = buildHtml(messageText, pixelUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [args.lead.email],
        subject,
        html,
        text: messageText,
      }),
    });

    const data = (await res.json()) as { id?: string; message?: string };

    if (!res.ok) {
      if (trackingId) {
        await prisma.emailTracking.update({
          where: { id: trackingId },
          data: { status: "failed", errorMessage: data.message || `HTTP ${res.status}` },
        }).catch(() => {});
      }
      return { ok: false, error: data.message || `HTTP ${res.status}` };
    }

    if (trackingId) {
      await prisma.emailTracking.update({
        where: { id: trackingId },
        data: { status: "sent", providerId: data.id, sentAt: new Date() },
      }).catch(() => {});
    }

    return { ok: true, providerId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "erro desconhecido";
    if (trackingId) {
      await prisma.emailTracking.update({
        where: { id: trackingId },
        data: { status: "failed", errorMessage: msg },
      }).catch(() => {});
    }
    return { ok: false, error: msg };
  }
}

function buildHtml(text: string, pixelUrl: string | null): string {
  const body = text
    .split(/\n\n+/)
    .map((para) => `<p style="margin: 0 0 16px 0; line-height: 1.5;">${escape(para).replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const pixel = pixelUrl
    ? `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;" />`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #1e293b; max-width: 560px; margin: 0 auto; padding: 16px;">
${body}
${pixel}
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
