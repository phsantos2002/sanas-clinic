"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export async function getGAConfig() {
  const user = await getCurrentUser();
  if (!user) return null;

  return prisma.gAConfig.findUnique({ where: { userId: user.id } });
}

export async function saveGAConfig(
  measurementId: string
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    await prisma.gAConfig.upsert({
      where: { userId: user.id },
      update: { measurementId },
      create: { userId: user.id, measurementId },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar configuração" };
  }
}
