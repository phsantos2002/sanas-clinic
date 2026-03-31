"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { revalidatePath } from "next/cache";

export async function isOnboardingComplete(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const config = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
    select: { businessProfile: true },
  });

  if (!config?.businessProfile) return false;
  const profile = config.businessProfile as Record<string, string>;
  return !!(profile.name && profile.niche);
}

export async function saveOnboardingData(data: {
  businessName: string;
  niche: string;
  city?: string;
  services?: string;
  avgTicket?: string;
  targetAudience?: string;
  tone?: string;
}): Promise<{ success: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const businessProfile = {
    name: data.businessName,
    niche: data.niche,
    city: data.city || "",
    services: data.services || "",
    avgTicket: data.avgTicket || "",
  };

  const brandIdentity = {
    business_type: data.niche,
    default_tone: data.tone || "profissional",
    target_audience: data.targetAudience || "",
  };

  await prisma.aIConfig.upsert({
    where: { userId: user.id },
    update: {
      clinicName: data.businessName,
      businessProfile: JSON.parse(JSON.stringify(businessProfile)),
      brandIdentity: JSON.parse(JSON.stringify(brandIdentity)),
    },
    create: {
      userId: user.id,
      clinicName: data.businessName,
      businessProfile: JSON.parse(JSON.stringify(businessProfile)),
      brandIdentity: JSON.parse(JSON.stringify(brandIdentity)),
    },
  });

  // Create default pipeline stages if none exist
  const stageCount = await prisma.stage.count({ where: { userId: user.id } });
  if (stageCount === 0) {
    const defaults = [
      { name: "Novo Lead", order: 1, eventName: "Lead" },
      { name: "Atendido", order: 2, eventName: "Contact" },
      { name: "Qualificado", order: 3, eventName: "QualifiedLead" },
      { name: "Agendado", order: 4, eventName: "Schedule" },
      { name: "Cliente", order: 5, eventName: "Purchase" },
    ];
    for (const stage of defaults) {
      await prisma.stage.create({ data: { ...stage, userId: user.id } });
    }
  }

  revalidatePath("/dashboard");
  return { success: true };
}
