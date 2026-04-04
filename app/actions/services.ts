"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export type ServiceData = {
  id?: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category?: string;
  isActive?: boolean;
};

export async function getServices() {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.service.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
}

export async function createService(data: ServiceData) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.service.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description || null,
        price: data.price || 0,
        duration: data.duration || 60,
        category: data.category || null,
      },
    });

    revalidatePath("/dashboard/settings/services");
    return { success: true };
  } catch (err) {
    console.error("[services] Erro ao criar:", err);
    return { success: false, error: "Erro ao criar servico" };
  }
}

export async function updateService(id: string, data: Partial<ServiceData>) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  await prisma.service.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      duration: data.duration,
      category: data.category,
      isActive: data.isActive,
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deleteService(id: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  await prisma.service.delete({ where: { id } });
  revalidatePath("/dashboard/settings");
  return { success: true };
}
