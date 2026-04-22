"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { normalizePhone } from "@/lib/validations";
import { logLeadActivity } from "@/services/leadActivity";
import { sendFacebookEvent } from "@/services/facebookEvents";
import type { ActionResult } from "@/types";

export type CNPJCompany = {
  cnpj: string;
  corporateName: string;
  tradeName: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  address: string;
  fullAddress: {
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  cnae: { code: string; description: string } | null;
  size: string | null;
  openedAt: string | null;
  capital: number | null;
  isHead?: boolean;
  simples?: boolean;
  mei?: boolean;
  legalNature?: string | null;
  members?: { name: string; role: string }[];
  score?: number;
};

export type CNPJImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { name: string; reason: string }[];
  batchId: string;
  createdLeadIds: string[];
};

export async function importFromCNPJ(data: {
  companies: CNPJCompany[];
  stageId: string;
  assignedTo?: string | null;
  searchQuery?: string;
}): Promise<ActionResult<CNPJImportResult>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!data.companies || data.companies.length === 0) {
    return { success: false, error: "Nenhuma empresa selecionada" };
  }
  if (data.companies.length > 500) {
    return { success: false, error: "Limite de 500 empresas por importação" };
  }

  const stage = await prisma.stage.findFirst({
    where: { id: data.stageId, userId: user.id },
    select: { id: true, name: true, eventName: true },
  });
  if (!stage) return { success: false, error: "Coluna não encontrada" };

  const batchId = nanoid(10);
  const errors: { name: string; reason: string }[] = [];
  const createdLeadIds: string[] = [];
  let created = 0;
  let skipped = 0;

  const tags = ["outbound", "cnpj-prospector"];

  for (const c of data.companies) {
    const displayName = c.tradeName?.trim() || c.corporateName.trim();

    if (!displayName) {
      errors.push({ name: "(sem nome)", reason: "Nome vazio" });
      continue;
    }
    if (!c.phone && !c.email) {
      errors.push({ name: displayName, reason: "Sem telefone e sem email" });
      continue;
    }

    let cleanPhone: string | null = null;
    if (c.phone) {
      const n = normalizePhone(c.phone);
      if (n.length >= 10 && n.length <= 15) cleanPhone = n;
    }

    // Dedup por telefone (quando houver) OU por email (quando não houver telefone).
    const existingFilter = cleanPhone
      ? { userId: user.id, phone: cleanPhone }
      : c.email
        ? { userId: user.id, email: c.email }
        : null;

    if (existingFilter) {
      const existing = await prisma.lead.findFirst({
        where: existingFilter,
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }
    }

    try {
      const notesParts: string[] = [];
      const cnpjFmt = c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      notesParts.push(`🧾 CNPJ: ${cnpjFmt}`);
      if (c.cnae) notesParts.push(`🏷️ CNAE: ${c.cnae.code} — ${c.cnae.description}`);
      if (c.size) notesParts.push(`📊 Porte: ${c.size}`);
      if (c.legalNature) notesParts.push(`⚖️ Natureza: ${c.legalNature}`);
      if (c.capital != null) notesParts.push(`💰 Capital: R$ ${c.capital.toLocaleString("pt-BR")}`);
      if (c.openedAt) notesParts.push(`📅 Aberta em: ${c.openedAt}`);
      if (c.isHead === false) notesParts.push(`🏢 Filial`);
      if (c.simples) notesParts.push(`✅ Optante Simples Nacional`);
      if (c.mei) notesParts.push(`🪪 MEI`);
      if (c.email) notesParts.push(`✉️ ${c.email}`);
      if (c.secondaryPhone) notesParts.push(`📞 Secundário: ${c.secondaryPhone}`);
      if (c.members && c.members.length > 0) {
        const list = c.members
          .slice(0, 5)
          .map((m) => (m.role ? `${m.name} (${m.role})` : m.name))
          .join("; ");
        notesParts.push(`👥 QSA: ${list}`);
      }
      if (typeof c.score === "number") notesParts.push(`⭐ Score prévio: ${c.score}/100`);
      if (data.searchQuery) notesParts.push(`🔎 Busca: "${data.searchQuery}"`);

      const createdLead = await prisma.lead.create({
        data: {
          userId: user.id,
          name: displayName,
          // Campo phone é obrigatório no schema — se não tiver, usamos uma string vazia marcada.
          // Mas tipicamente o filtro da UI força telefone ON; o dedup por email serve
          // como guarda extra. Se chegou aqui sem phone, grava como string vazia (raro).
          phone: cleanPhone ?? "",
          email: c.email || null,
          address: c.address || null,
          city: c.fullAddress.city ?? null,
          notes: notesParts.join("\n"),
          company: c.corporateName || null,
          industry: c.cnae?.description ?? null,
          leadType: "outbound",
          source: "cnpj",
          medium: "outbound",
          tags,
          importBatchId: batchId,
          stageId: stage.id,
          aiEnabled: false,
          assignedTo: data.assignedTo || null,
        },
      });
      created++;
      createdLeadIds.push(createdLead.id);

      await logLeadActivity({
        leadId: createdLead.id,
        userId: user.id,
        type: "import",
        summary: "Importado via CNPJ/Receita",
        metadata: {
          batchId,
          cnpj: c.cnpj,
          cnae: c.cnae?.code,
          size: c.size ?? undefined,
          searchQuery: data.searchQuery,
        },
        actorType: "user",
        actorName: user.name ?? user.email ?? undefined,
      });

      if (stage.eventName && cleanPhone) {
        sendFacebookEvent({
          userId: user.id,
          phone: cleanPhone,
          eventName: stage.eventName,
          leadId: createdLead.id,
          stageName: stage.name,
        }).catch(() => {});
      }
    } catch (err) {
      errors.push({
        name: displayName,
        reason: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/prospeccao");

  return {
    success: true,
    data: {
      total: data.companies.length,
      created,
      skipped,
      errors,
      batchId,
      createdLeadIds,
    },
  };
}
