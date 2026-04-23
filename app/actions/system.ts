"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types";

// ── Webhook DLQ ──────────────────────────────────────────────

export type DLQEntry = {
  id: string;
  source: string;
  errorMessage: string;
  attempts: number;
  phone: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  rawPayloadPreview: string;
};

export async function listWebhookDLQ(
  opts: {
    showResolved?: boolean;
    limit?: number;
  } = {}
): Promise<DLQEntry[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.webhookDLQ.findMany({
    where: {
      OR: [{ userId: user.id }, { userId: null }],
      ...(opts.showResolved ? {} : { resolvedAt: null }),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
  });

  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    errorMessage: r.errorMessage,
    attempts: r.attempts,
    phone: r.phone,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    rawPayloadPreview: JSON.stringify(r.rawPayload).slice(0, 200),
  }));
}

export async function getDLQEntry(
  id: string
): Promise<{ rawPayload: unknown; errorStack: string | null } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const row = await prisma.webhookDLQ.findFirst({
    where: { id, OR: [{ userId: user.id }, { userId: null }] },
    select: { rawPayload: true, errorStack: true },
  });
  return row;
}

export async function resolveDLQEntry(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const result = await prisma.webhookDLQ.updateMany({
    where: { id, OR: [{ userId: user.id }, { userId: null }] },
    data: { resolvedAt: new Date() },
  });
  if (result.count === 0) return { success: false, error: "Entrada não encontrada" };

  logAudit({
    userId: user.id,
    action: "dlq.resolve",
    entityType: "WebhookDLQ",
    entityId: id,
  }).catch(() => {});

  revalidatePath("/dashboard/settings/system");
  return { success: true };
}

// ── Audit log ────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
};

export async function listAuditLog(
  opts: {
    action?: string;
    limit?: number;
  } = {}
): Promise<AuditEntry[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.auditLog.findMany({
    where: {
      userId: user.id,
      ...(opts.action ? { action: opts.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
  });

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    metadata: r.metadata,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt,
  }));
}

// ── LGPD ────────────────────────────────────────────────────

export async function lgpdLookup(phone: string): Promise<{
  found: boolean;
  leadId?: string;
  name?: string;
  messageCount?: number;
  createdAt?: Date;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 8) return { found: false };

  const lead = await prisma.lead.findFirst({
    where: { userId: user.id, phone: normalized },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });

  if (!lead) return { found: false };
  return {
    found: true,
    leadId: lead.id,
    name: lead.name,
    messageCount: lead._count.messages,
    createdAt: lead.createdAt,
  };
}
