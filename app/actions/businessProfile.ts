"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export type BusinessProfileData = {
  companyName?: string | null;
  description?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  website?: string | null;
  instagram?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  businessHours?: string | null;
  pixKey?: string | null;
  pixKeyType?: string | null;
};

export async function getBusinessProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  return prisma.businessProfile.findUnique({
    where: { userId: user.id },
  });
}

export async function updateBusinessProfile(data: BusinessProfileData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  // Normalize empty strings to null so the AI context formatter can drop
  // truly absent fields instead of injecting "Endereço: " into the prompt.
  const norm = (v: string | null | undefined) => {
    if (v == null) return null;
    const t = String(v).trim();
    return t === "" ? null : t;
  };

  try {
    await prisma.businessProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        companyName: norm(data.companyName),
        description: norm(data.description),
        businessEmail: norm(data.businessEmail),
        businessPhone: norm(data.businessPhone),
        website: norm(data.website),
        instagram: norm(data.instagram),
        address: norm(data.address),
        city: norm(data.city),
        state: norm(data.state),
        zipCode: norm(data.zipCode),
        businessHours: norm(data.businessHours),
        pixKey: norm(data.pixKey),
        pixKeyType: norm(data.pixKeyType),
      },
      update: {
        companyName: norm(data.companyName),
        description: norm(data.description),
        businessEmail: norm(data.businessEmail),
        businessPhone: norm(data.businessPhone),
        website: norm(data.website),
        instagram: norm(data.instagram),
        address: norm(data.address),
        city: norm(data.city),
        state: norm(data.state),
        zipCode: norm(data.zipCode),
        businessHours: norm(data.businessHours),
        pixKey: norm(data.pixKey),
        pixKeyType: norm(data.pixKeyType),
      },
    });

    revalidatePath("/dashboard/settings/business");
    return { success: true };
  } catch (err) {
    console.error("[businessProfile] erro ao salvar:", err);
    return { success: false, error: "Erro ao salvar dados do negócio" };
  }
}

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "Email",
  phone: "Telefone",
  random: "Aleatória",
};

/**
 * Formats the business profile as a context block injected into the AI's
 * system prompt by webhookProcessor. Returns null when there's no profile
 * or all fields are empty (so the prompt doesn't get "INFORMAÇÕES DO
 * NEGÓCIO:" with nothing under it).
 */
export async function getBusinessContextForAI(userId: string): Promise<string | null> {
  const profile = await prisma.businessProfile.findUnique({ where: { userId } });
  if (!profile) return null;

  const lines: string[] = [];
  if (profile.companyName) lines.push(`- Nome: ${profile.companyName}`);
  if (profile.description) lines.push(`- Sobre: ${profile.description}`);

  const locationParts = [profile.address, profile.city, profile.state, profile.zipCode].filter(
    Boolean
  );
  if (locationParts.length > 0) lines.push(`- Endereço: ${locationParts.join(", ")}`);

  if (profile.businessHours) lines.push(`- Horário de funcionamento: ${profile.businessHours}`);
  if (profile.businessPhone) lines.push(`- Telefone: ${profile.businessPhone}`);
  if (profile.businessEmail) lines.push(`- Email: ${profile.businessEmail}`);
  if (profile.website) lines.push(`- Site: ${profile.website}`);
  if (profile.instagram) lines.push(`- Instagram: ${profile.instagram}`);

  if (profile.pixKey) {
    const typeLabel = profile.pixKeyType
      ? PIX_KEY_TYPE_LABELS[profile.pixKeyType] || profile.pixKeyType
      : null;
    lines.push(typeLabel ? `- PIX (${typeLabel}): ${profile.pixKey}` : `- PIX: ${profile.pixKey}`);
  }

  if (lines.length === 0) return null;

  return [
    "INFORMAÇÕES DO NEGÓCIO:",
    ...lines,
    "",
    "Use estas informações para responder perguntas dos clientes com precisão.",
    "Quando alguém pedir o PIX, dê o tipo + chave.",
  ].join("\n");
}
