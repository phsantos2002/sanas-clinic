"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveSession } from "@/app/actions/user";
import { requireManagerContext } from "@/lib/authGuard";
import { normalizePhone } from "@/lib/validations";
import type { ActionResult } from "@/types";

/**
 * Contatos — banco de contatos do tenant (a base é o próprio Lead) +
 * sincronização da agenda do WhatsApp conectado (Evolution).
 */

export type ContactRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  city: string | null;
  birthday: Date | null;
  tags: string[];
  source: string | null;
  stageName: string | null;
  assignedToName: string | null;
  aiEnabled: boolean;
  lastInteractionAt: Date | null;
  createdAt: Date;
};

export async function getContacts(search?: string): Promise<ContactRow[]> {
  const ctx = await resolveSession();
  if (!ctx) return [];

  const q = search?.trim();
  const leads = await prisma.lead.findMany({
    where: {
      userId: ctx.tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q.replace(/\D/g, "") || q } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { stage: { select: { name: true } } },
    orderBy: [{ lastInteractionAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 500,
  });

  const attendantIds = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))] as string[];
  const attendants = attendantIds.length
    ? await prisma.attendant.findMany({
        where: { id: { in: attendantIds } },
        select: { id: true, name: true },
      })
    : [];
  const attMap = new Map(attendants.map((a) => [a.id, a.name]));

  return leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    photoUrl: l.photoUrl,
    city: l.city,
    birthday: l.birthday,
    tags: l.tags,
    source: l.source,
    stageName: l.stage?.name ?? null,
    assignedToName: l.assignedTo ? (attMap.get(l.assignedTo) ?? null) : null,
    aiEnabled: l.aiEnabled,
    lastInteractionAt: l.lastInteractionAt,
    createdAt: l.createdAt,
  }));
}

/**
 * Importa a agenda do WhatsApp de uma conexão Evolution para o banco de
 * contatos: cria leads novos e enriquece existentes (nome/foto vazios).
 */
export async function syncContactsFromConnection(
  connectionId: string
): Promise<ActionResult<{ imported: number; updated: number; total: number }>> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  const conn = await prisma.whatsAppConnection.findFirst({
    where: { id: connectionId, userId: ctx.tenantId, provider: "evolution" },
  });
  if (!conn || !conn.serverUrl || !conn.instanceToken || !conn.instanceName) {
    return { success: false, error: "Conexao Evolution nao encontrada" };
  }

  const { fetchEvolutionContacts } = await import("@/services/whatsappEvolution");
  const result = await fetchEvolutionContacts(conn.serverUrl, conn.instanceToken, conn.instanceName);
  if (!result.success) {
    return { success: false, error: result.error ?? "Falha ao buscar contatos" };
  }

  // Etapa inicial para leads novos
  const firstStage = await prisma.stage.findFirst({
    where: { userId: ctx.tenantId },
    orderBy: { order: "asc" },
    select: { id: true },
  });

  let imported = 0;
  let updated = 0;

  for (const contact of result.contacts) {
    const phone = normalizePhone(contact.id.split("@")[0]);
    if (!phone || phone.length < 10) continue;

    const existing = await prisma.lead.findUnique({
      where: { userId_phone: { userId: ctx.tenantId, phone } },
      select: { id: true, name: true, photoUrl: true },
    });

    if (!existing) {
      await prisma.lead
        .create({
          data: {
            userId: ctx.tenantId,
            phone,
            name: contact.pushName?.trim() || phone,
            photoUrl: contact.profilePicUrl ?? null,
            source: "whatsapp",
            stageId: firstStage?.id ?? null,
            connectionId: conn.id,
            aiEnabled: false, // importado da agenda: IA só ativa quando o lead chamar
          },
        })
        .then(() => imported++)
        .catch(() => {}); // corrida P2002
      continue;
    }

    // Enriquece sem sobrescrever dados preenchidos
    const patch: Record<string, unknown> = {};
    const nameIsPhone = existing.name === existing.name.replace(/[^\d+]/g, "");
    if (contact.pushName?.trim() && (!existing.name || nameIsPhone)) {
      patch.name = contact.pushName.trim();
    }
    if (contact.profilePicUrl && !existing.photoUrl) patch.photoUrl = contact.profilePicUrl;
    if (Object.keys(patch).length > 0) {
      await prisma.lead.update({ where: { id: existing.id }, data: patch }).catch(() => {});
      updated++;
    }
  }

  revalidatePath("/dashboard/chat/contatos");
  return { success: true, data: { imported, updated, total: result.contacts.length } };
}
