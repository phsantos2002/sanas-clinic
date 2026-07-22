import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Ticket } from "@prisma/client";

/**
 * Ciclo de vida de tickets (Atendimentos) — semântica Whaticket com a IA
 * como estado de primeira classe:
 *
 *   bot ──handoff──► pending ──aceitar──► open ──resolver──► resolved
 *    │                  ▲                                        │
 *    └──────────────────┘◄──────────── reabre (<24h) ────────────┘
 *
 * Invariante (índice parcial no DB): no máximo 1 ticket ativo
 * (bot|pending|open) por lead.
 */

const log = logger.child({ service: "ticketService" });

export const ACTIVE_STATUSES = ["bot", "pending", "open"] as const;
const REOPEN_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getActiveTicket(leadId: string): Promise<Ticket | null> {
  return prisma.ticket.findFirst({
    where: { leadId, status: { in: [...ACTIVE_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Garante um ticket para uma mensagem inbound:
 *  - ativo existe → atualiza lastInboundAt e retorna;
 *  - último resolvido há <24h → REABRE (mesmo atendente → open; senão pending);
 *  - senão CRIA: "bot" se a IA vai atender, senão "pending" (fila geral).
 */
export async function ensureTicketForInbound(args: {
  userId: string;
  leadId: string;
  connectionId?: string | null;
  aiWillHandle: boolean;
}): Promise<Ticket> {
  const now = new Date();

  const active = await getActiveTicket(args.leadId);
  if (active) {
    return prisma.ticket.update({
      where: { id: active.id },
      data: { lastInboundAt: now },
    });
  }

  const lastResolved = await prisma.ticket.findFirst({
    where: { leadId: args.leadId, status: "resolved" },
    orderBy: { resolvedAt: "desc" },
  });

  if (
    lastResolved?.resolvedAt &&
    now.getTime() - lastResolved.resolvedAt.getTime() < REOPEN_WINDOW_MS
  ) {
    const reopened = await prisma.ticket.update({
      where: { id: lastResolved.id },
      data: {
        status: lastResolved.attendantId ? "open" : "pending",
        resolvedAt: null,
        lastInboundAt: now,
        ...(lastResolved.attendantId ? {} : { pendingAt: now }),
      },
    });
    log.info("ticket_reopened", { ticketId: reopened.id, leadId: args.leadId });
    return reopened;
  }

  try {
    const created = await prisma.ticket.create({
      data: {
        userId: args.userId,
        leadId: args.leadId,
        connectionId: args.connectionId ?? null,
        status: args.aiWillHandle ? "bot" : "pending",
        pendingAt: args.aiWillHandle ? null : now,
        lastInboundAt: now,
      },
    });
    log.info("ticket_created", { ticketId: created.id, status: created.status });
    return created;
  } catch (err) {
    // Corrida com o índice parcial (2 inbounds simultâneos) → pega o vencedor.
    const winner = await getActiveTicket(args.leadId);
    if (winner) return winner;
    throw err;
  }
}

/**
 * Handoff humano: bot → pending, entra na fila do atendente (se tiver) e
 * registra pendingAt. Chamado pelas 3 vias de handoff (keyword/IA/fluxo).
 */
export async function moveTicketToHumanQueue(args: {
  leadId: string;
  attendantId?: string | null;
}): Promise<Ticket | null> {
  const active = await getActiveTicket(args.leadId);
  if (!active || active.status !== "bot") return active;

  let queueId: string | null = null;
  if (args.attendantId) {
    const membership = await prisma.queueAttendant.findFirst({
      where: { attendantId: args.attendantId },
      orderBy: { queue: { order: "asc" } },
    });
    queueId = membership?.queueId ?? null;
  }

  return prisma.ticket.update({
    where: { id: active.id },
    data: {
      status: "pending",
      pendingAt: new Date(),
      queueId,
      // pré-atribui o atendente escolhido pelo round-robin; ele confirma no aceite
      attendantId: args.attendantId ?? null,
    },
  });
}

/** Aceitar: pending → open. Vendedor também recebe o lead (escopo).
 *  attendantId null = dono/gestor atendendo pessoalmente. */
export async function acceptTicket(args: {
  ticketId: string;
  userId: string;
  attendantId: string | null;
}): Promise<Ticket | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: args.ticketId, userId: args.userId, status: "pending" },
  });
  if (!ticket) return null;

  const ops = [
    prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: "open", attendantId: args.attendantId, acceptedAt: new Date() },
    }),
  ];
  if (args.attendantId) {
    ops.push(
      prisma.lead.update({
        where: { id: ticket.leadId },
        data: { assignedTo: args.attendantId },
      }) as never
    );
  }
  const [updated] = await prisma.$transaction(ops);
  log.info("ticket_accepted", { ticketId: ticket.id, attendantId: args.attendantId });
  return updated as Ticket;
}

/** Resolver: open|pending|bot → resolved. */
export async function resolveTicket(args: {
  ticketId: string;
  userId: string;
}): Promise<Ticket | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: args.ticketId, userId: args.userId, status: { in: [...ACTIVE_STATUSES] } },
  });
  if (!ticket) return null;

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  log.info("ticket_resolved", { ticketId: ticket.id });
  return updated;
}

/** Transfere para outro atendente (mantém open) ou para uma fila (volta a pending). */
export async function transferTicket(args: {
  ticketId: string;
  userId: string;
  toAttendantId?: string | null;
  toQueueId?: string | null;
}): Promise<Ticket | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: args.ticketId, userId: args.userId, status: { in: [...ACTIVE_STATUSES] } },
  });
  if (!ticket) return null;

  if (args.toAttendantId) {
    const [updated] = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: "open", attendantId: args.toAttendantId, acceptedAt: new Date() },
      }),
      prisma.lead.update({
        where: { id: ticket.leadId },
        data: { assignedTo: args.toAttendantId },
      }),
    ]);
    return updated;
  }

  return prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: "pending",
      pendingAt: new Date(),
      queueId: args.toQueueId ?? null,
      attendantId: null,
    },
  });
}

/** Estampa a primeira resposta humana (TME) e o último outbound do ticket. */
export async function stampHumanReply(args: {
  leadId: string;
  attendantId: string | null;
}): Promise<Ticket | null> {
  const active = await getActiveTicket(args.leadId);
  if (!active) return null;

  return prisma.ticket.update({
    where: { id: active.id },
    data: {
      lastOutboundAt: new Date(),
      ...(active.firstHumanReplyAt || !args.attendantId
        ? {}
        : { firstHumanReplyAt: new Date() }),
    },
  });
}
