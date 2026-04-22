"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { normalizePhone } from "@/lib/validations";
import { logLeadActivity } from "@/services/leadActivity";
import { sendFacebookEvent } from "@/services/facebookEvents";
import type { ActionResult } from "@/types";

export type GoogleMapsPlace = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  mapsUrl: string | null;
  types: string[];
};

export type GoogleMapsImportResult = {
  total: number;
  created: number;
  skipped: number;
  errors: { name: string; reason: string }[];
  batchId: string;
};

export async function importFromGoogleMaps(data: {
  places: GoogleMapsPlace[];
  stageId: string;
  assignedTo?: string | null;
  searchQuery?: string;
}): Promise<ActionResult<GoogleMapsImportResult>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  if (!data.places || data.places.length === 0) {
    return { success: false, error: "Nenhum estabelecimento selecionado" };
  }
  if (data.places.length > 500) {
    return { success: false, error: "Limite de 500 leads por importação" };
  }

  const stage = await prisma.stage.findFirst({
    where: { id: data.stageId, userId: user.id },
    select: { id: true, name: true, eventName: true },
  });
  if (!stage) return { success: false, error: "Coluna não encontrada" };

  const batchId = nanoid(10);
  const errors: { name: string; reason: string }[] = [];
  let created = 0;
  let skipped = 0;

  const tags = ["outbound", "google-maps"];

  for (const place of data.places) {
    if (!place.name?.trim() || !place.phone) {
      errors.push({ name: place.name, reason: "Telefone obrigatório" });
      continue;
    }

    const cleanPhone = normalizePhone(place.phone);
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push({ name: place.name, reason: "Telefone inválido" });
      continue;
    }

    const existing = await prisma.lead.findFirst({
      where: { userId: user.id, phone: cleanPhone },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      const notesParts: string[] = [];
      if (place.rating != null)
        notesParts.push(
          `⭐ ${place.rating}${place.reviews ? ` (${place.reviews} avaliações)` : ""}`
        );
      if (place.website) notesParts.push(`🌐 ${place.website}`);
      if (place.mapsUrl) notesParts.push(`📍 ${place.mapsUrl}`);
      if (data.searchQuery) notesParts.push(`🔎 Busca: "${data.searchQuery}"`);

      const createdLead = await prisma.lead.create({
        data: {
          userId: user.id,
          name: place.name.trim(),
          phone: cleanPhone,
          email: null,
          address: place.address || null,
          notes: notesParts.join("\n") || null,
          company: place.name.trim(),
          industry: place.types[0] ?? null,
          leadType: "outbound",
          source: "google_maps",
          medium: "outbound",
          tags,
          importBatchId: batchId,
          stageId: stage.id,
          aiEnabled: false,
          assignedTo: data.assignedTo || null,
        },
      });
      created++;

      await logLeadActivity({
        leadId: createdLead.id,
        userId: user.id,
        type: "import",
        summary: "Importado via Google Maps",
        metadata: {
          batchId,
          placeId: place.placeId,
          rating: place.rating ?? undefined,
          reviews: place.reviews ?? undefined,
          searchQuery: data.searchQuery,
        },
        actorType: "user",
        actorName: user.name ?? user.email ?? undefined,
      });

      if (stage.eventName) {
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
        name: place.name,
        reason: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard/prospeccao");

  return {
    success: true,
    data: { total: data.places.length, created, skipped, errors, batchId },
  };
}
