import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/services/whatsappService";
import { getSendConnection } from "@/services/connections";

/**
 * GET /api/cron/dispatch — despacha mensagens 1:1 agendadas vencidas.
 *
 * Cadência ideal: a cada 5 minutos (Vercel Pro) ou pinger externo
 * (pg_cron/upstash). No plano Hobby (cron diário) as mensagens saem
 * no próximo tick — avisar o tenant sobre a precisão.
 */
export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  const log = logger.child({ cron: "dispatch" });
  const due = await prisma.scheduledMessage.findMany({
    where: { status: "pending", scheduledAt: { lte: new Date() } },
    include: { lead: true },
    take: 100,
    orderBy: { scheduledAt: "asc" },
  });

  let sent = 0;
  let failed = 0;

  for (const msg of due) {
    try {
      const send = await getSendConnection(msg.lead);
      if (!send) throw new Error("Nenhuma conexao WhatsApp disponivel");

      const result = await sendMessage(send.config, msg.lead.phone, msg.content);
      if (!result.success) throw new Error(result.error ?? "Falha no envio");

      const { stampHumanReply, getActiveTicket } = await import("@/services/ticketService");
      const ticket = await getActiveTicket(msg.leadId).catch(() => null);
      await stampHumanReply({ leadId: msg.leadId, attendantId: msg.attendantId }).catch(() => null);

      await prisma.$transaction([
        prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: "sent", sentAt: new Date() },
        }),
        prisma.message.create({
          data: {
            leadId: msg.leadId,
            role: "assistant",
            content: msg.content,
            ticketId: ticket?.id ?? null,
            attendantId: msg.attendantId,
            connectionId: send.connectionId,
          },
        }),
      ]);
      sent++;
    } catch (err) {
      failed++;
      await prisma.scheduledMessage
        .update({
          where: { id: msg.id },
          data: {
            status: "failed",
            error: err instanceof Error ? err.message.slice(0, 500) : "erro",
          },
        })
        .catch(() => {});
      log.error("dispatch_failed", { scheduledMessageId: msg.id, err });
    }
  }

  log.info("dispatch_done", { due: due.length, sent, failed });
  return NextResponse.json({ ok: true, due: due.length, sent, failed });
}
