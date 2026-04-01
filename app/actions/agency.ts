"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { revalidatePath } from "next/cache";

export async function getAgency() {
  const user = await getCurrentUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { agency: true },
  });

  return dbUser?.agency || null;
}

export async function createAgency(data: {
  name: string;
  subdomain: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  productName?: string;
  supportEmail?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  // Check subdomain availability
  const existing = await prisma.agency.findUnique({ where: { subdomain: data.subdomain } });
  if (existing) return { success: false, error: "Subdominio ja em uso" };

  const agency = await prisma.agency.create({
    data: {
      name: data.name,
      subdomain: data.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor || "#4f46e5",
      secondaryColor: data.secondaryColor || "#7c3aed",
      productName: data.productName || "LuxCRM",
      supportEmail: data.supportEmail,
    },
  });

  // Link user to agency
  await prisma.user.update({
    where: { id: user.id },
    data: { agencyId: agency.id },
  });

  revalidatePath("/dashboard");
  return { success: true, data: agency };
}

export async function updateAgency(data: {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  productName?: string;
  supportEmail?: string;
  customDomain?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser?.agencyId) return { success: false, error: "Sem agencia" };

  await prisma.agency.update({
    where: { id: dbUser.agencyId },
    data,
  });

  revalidatePath("/dashboard");
  return { success: true };
}
