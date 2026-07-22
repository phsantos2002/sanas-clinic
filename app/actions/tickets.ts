"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveSession } from "@/app/actions/user";
import { isRestrictedRole } from "@/lib/session";
import type { ActionResult } from "@/types";
import type { Prisma } from "@prisma/client";

/**
 * Atendimentos — actions do inbox de tickets, com escopo por papel:
 *  - dono/admin/manager: veem tudo;
 *  - vendedor/cs: fila (pending) dos seus setores + fila geral, e os próprios
 *    tickets abertos/resolvidos.
 */

export type TicketStatus = "bot" | "pending" | "open" | "resolved";

export type TicketListItem = {
  id: string;
  status: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  queueName: string | null;
  queueColor: string | null;
  attendantId: string | null;
  attendantName: string | null;
  lastMessage: string | null;
  lastInboundAt: Date | null;
  openedAt: Date;
};

async function ticketScopeWhere(status: TicketStatus): Promise<Prisma.TicketWhereInput | null> {
  const ctx = await resolveSession();
  if (!ctx) return null;

  const base: Prisma.TicketWhereInput = { userId: ctx.tenantId, status };
  if (!isRestrictedRole(ctx.role)) return base;

  // Vendedor: fila dos seus setores (ou geral) + os próprios tickets
  if (status === "pending") {
    const memberships = await prisma.queueAttendant.findMany({
      where: { attendantId: ctx.attendantId ?? "" },
      select: { queueId: true },
    });
    const queueIds = memberships.map((m) => m.queueId);
    return {
      ...base,
      OR: [
        { queueId: null },
        { queueId: { in: queueIds } },
        { attendantId: ctx.attendantId ?? "" },
      ],
    };
  }
  return { ...base, attendantId: ctx.attendantId ?? "" };
}

export async function getTicketCounts(): Promise<Record<TicketStatus, number>> {
  const counts: Record<TicketStatus, number> = { bot: 0, pending: 0, open: 0, resolved: 0 };
  for (const status of ["bot", "pending", "open", "resolved"] as const) {
    const where = await ticketScopeWhere(status);
    if (where) counts[status] = await prisma.ticket.count({ where });
  }
  return counts;
}

export async function listTickets(status: TicketStatus): Promise<TicketListItem[]> {
  const where = await ticketScopeWhere(status);
  if (!where) return [];

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      queue: { select: { name: true, color: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
    orderBy: [{ lastInboundAt: "desc" }, { openedAt: "desc" }],
    take: 100,
  });

  // Nome dos atendentes num lookup só
  const attendantIds = [...new Set(tickets.map((t) => t.attendantId).filter(Boolean))] as string[];
  const attendants = attendantIds.length
    ? await prisma.attendant.findMany({
        where: { id: { in: attendantIds } },
        select: { id: true, name: true },
      })
    : [];
  const attendantMap = new Map(attendants.map((a) => [a.id, a.name]));

  return tickets.map((t) => ({
    id: t.id,
    status: t.status,
    leadId: t.leadId,
    leadName: t.lead.name,
    leadPhone: t.lead.phone,
    queueName: t.queue?.name ?? null,
    queueColor: t.queue?.color ?? null,
    attendantId: t.attendantId,
    attendantName: t.attendantId ? (attendantMap.get(t.attendantId) ?? null) : null,
    lastMessage: t.messages[0]?.content?.slice(0, 80) ?? null,
    lastInboundAt: t.lastInboundAt,
    openedAt: t.openedAt,
  }));
}

export type TicketConversation = {
  ticket: {
    id: string;
    status: string;
    leadId: string;
    attendantId: string | null;
    queueName: string | null;
  };
  lead: { id: string; name: string; phone: string; aiEnabled: boolean };
  messages: {
    id: string;
    role: string;
    content: string;
    attendantId: string | null;
    createdAt: Date;
  }[];
};

export async function getTicketConversation(
  ticketId: string
): Promise<TicketConversation | null> {
  const ctx = await resolveSession();
  if (!ctx) return null;

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: ctx.tenantId },
    include: {
      lead: { select: { id: true, name: true, phone: true, aiEnabled: true } },
      queue: { select: { name: true } },
    },
  });
  if (!ticket) return null;

  // Vendedor só abre ticket da fila acessível ou próprio
  if (isRestrictedRole(ctx.role)) {
    const mine = ticket.attendantId === ctx.attendantId;
    const inQueue =
      ticket.status === "pending" &&
      (ticket.queueId === null ||
        (await prisma.queueAttendant.findFirst({
          where: { queueId: ticket.queueId, attendantId: ctx.attendantId ?? "" },
        })) !== null);
    if (!mine && !inQueue) return null;
  }

  // Histórico completo do lead (não só do ticket) — contexto de conversas passadas
  const messages = await prisma.message.findMany({
    where: { leadId: ticket.leadId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, role: true, content: true, attendantId: true, createdAt: true },
  });

  return {
    ticket: {
      id: ticket.id,
      status: ticket.status,
      leadId: ticket.leadId,
      attendantId: ticket.attendantId,
      queueName: ticket.queue?.name ?? null,
    },
    lead: ticket.lead,
    messages,
  };
}

export async function acceptTicketAction(ticketId: string): Promise<ActionResult> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };

  const { acceptTicket } = await import("@/services/ticketService");
  const result = await acceptTicket({
    ticketId,
    userId: ctx.tenantId,
    attendantId: ctx.attendantId,
  });
  if (!result) return { success: false, error: "Ticket nao esta na fila" };

  revalidatePath("/dashboard/atendimentos");
  return { success: true };
}

export async function resolveTicketAction(ticketId: string): Promise<ActionResult> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };

  const { resolveTicket } = await import("@/services/ticketService");
  const result = await resolveTicket({ ticketId, userId: ctx.tenantId });
  if (!result) return { success: false, error: "Ticket nao encontrado" };

  revalidatePath("/dashboard/atendimentos");
  return { success: true };
}

export async function transferTicketAction(
  ticketId: string,
  target: { attendantId?: string | null; queueId?: string | null }
): Promise<ActionResult> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };

  const { transferTicket } = await import("@/services/ticketService");
  const result = await transferTicket({
    ticketId,
    userId: ctx.tenantId,
    toAttendantId: target.attendantId ?? null,
    toQueueId: target.queueId ?? null,
  });
  if (!result) return { success: false, error: "Ticket nao encontrado" };

  revalidatePath("/dashboard/atendimentos");
  return { success: true };
}

/** Agenda uma mensagem 1:1 para o lead do ticket (despachada pelo cron). */
export async function scheduleTicketMessage(
  ticketId: string,
  content: string,
  scheduledAt: string // ISO
): Promise<ActionResult> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };
  if (!content.trim()) return { success: false, error: "Mensagem vazia" };

  const when = new Date(scheduledAt);
  if (isNaN(when.getTime()) || when <= new Date()) {
    return { success: false, error: "Data deve ser no futuro" };
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: ctx.tenantId },
  });
  if (!ticket) return { success: false, error: "Ticket nao encontrado" };

  await prisma.scheduledMessage.create({
    data: {
      userId: ctx.tenantId,
      leadId: ticket.leadId,
      attendantId: ctx.attendantId,
      content: content.trim(),
      scheduledAt: when,
    },
  });
  return { success: true };
}

/** Envia mensagem (WhatsApp) ou registra nota interna no ticket. */
export async function sendTicketMessage(
  ticketId: string,
  content: string,
  opts: { isNote?: boolean } = {}
): Promise<ActionResult> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };
  if (!content.trim()) return { success: false, error: "Mensagem vazia" };

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: ctx.tenantId },
    include: { lead: { select: { id: true, connectionId: true } } },
  });
  if (!ticket) return { success: false, error: "Ticket nao encontrado" };

  if (opts.isNote) {
    await prisma.message.create({
      data: {
        leadId: ticket.leadId,
        role: "note",
        content: content.trim(),
        ticketId: ticket.id,
        attendantId: ctx.attendantId,
        connectionId: ticket.lead.connectionId,
      },
    });
    return { success: true };
  }

  const { sendManualMessage } = await import("@/app/actions/messages");
  return sendManualMessage(ticket.leadId, content.trim());
}
