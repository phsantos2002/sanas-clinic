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
    mediaUrl: string | null;
    mediaType: string | null;
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
    select: {
      id: true,
      role: true,
      content: true,
      attendantId: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
    },
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

/**
 * Cria (ou reabre) um atendimento manualmente — vendedor inicia a conversa
 * com um contato. Cria o lead se não existir e abre o ticket já atribuído.
 */
export async function createManualTicket(input: {
  phone: string;
  name?: string;
  connectionId?: string | null;
}): Promise<ActionResult<{ ticketId: string }>> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };

  const { normalizePhone } = await import("@/lib/validations");
  const phone = normalizePhone(input.phone);
  if (!phone || phone.length < 10) return { success: false, error: "Telefone invalido" };

  // Acha ou cria o lead do tenant
  let lead = await prisma.lead.findFirst({
    where: { userId: ctx.tenantId, phone },
  });
  if (!lead) {
    // Etapa inicial do funil (menor order) para o novo lead
    const firstStage = await prisma.stage.findFirst({
      where: { userId: ctx.tenantId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    lead = await prisma.lead.create({
      data: {
        userId: ctx.tenantId,
        phone,
        name: input.name?.trim() || phone,
        source: "manual",
        stageId: firstStage?.id ?? null,
        assignedTo: ctx.attendantId,
        connectionId: input.connectionId ?? null,
      },
    });
  } else if (ctx.attendantId && !lead.assignedTo) {
    await prisma.lead.update({ where: { id: lead.id }, data: { assignedTo: ctx.attendantId } });
  }

  // Reaproveita ticket ativo, senão cria um aberto já atribuído
  const { getActiveTicket } = await import("@/services/ticketService");
  const active = await getActiveTicket(lead.id);
  if (active) {
    // Traz pra atendimento humano se estava com a IA
    if (active.status !== "open") {
      await prisma.ticket.update({
        where: { id: active.id },
        data: { status: "open", attendantId: ctx.attendantId, acceptedAt: new Date() },
      });
    }
    return { success: true, data: { ticketId: active.id } };
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId: ctx.tenantId,
      leadId: lead.id,
      connectionId: input.connectionId ?? lead.connectionId ?? null,
      status: "open",
      attendantId: ctx.attendantId,
      acceptedAt: new Date(),
      openedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/atendimentos");
  return { success: true, data: { ticketId: ticket.id } };
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

/** Resumo IA do atendimento: TL;DR + pontos-chave + próximo passo (Claude). */
export async function summarizeTicket(
  ticketId: string
): Promise<ActionResult<{ summary: string }>> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: ctx.tenantId },
    include: { lead: { select: { name: true } } },
  });
  if (!ticket) return { success: false, error: "Ticket nao encontrado" };

  const config = await prisma.aIConfig.findUnique({
    where: { userId: ctx.tenantId },
    select: { anthropicKey: true },
  });
  const apiKey = config?.anthropicKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Configure a chave Anthropic em Config → IA Chat para usar o resumo IA.",
    };
  }

  const messages = await prisma.message.findMany({
    where: { leadId: ticket.leadId, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { role: true, content: true },
  });
  if (messages.length === 0) return { success: false, error: "Sem mensagens para resumir" };

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Cliente" : "Atendimento"}: ${m.content}`)
    .join("\n")
    .slice(0, 12000);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system:
        "Voce resume atendimentos de WhatsApp em portugues brasileiro para um vendedor que vai assumir a conversa. Seja objetivo. Formato:\n**Resumo:** (1-2 frases)\n**Interesse/necessidade:** \n**Objeções/pendências:** \n**Próximo passo sugerido:** ",
      messages: [
        {
          role: "user",
          content: `Resuma este atendimento com ${ticket.lead.name}:\n\n${transcript}`,
        },
      ],
    });
    const summary = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();
    return { success: true, data: { summary: summary || "Sem resumo disponivel." } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message.slice(0, 200) : "Falha ao gerar resumo",
    };
  }
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
