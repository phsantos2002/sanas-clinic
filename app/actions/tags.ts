"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult, Tag } from "@/types";

export async function getTags(): Promise<Tag[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
}

export async function createTag(name: string): Promise<ActionResult<Tag>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const tag = await prisma.tag.create({
      data: { name: name.trim(), userId: user.id },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true, data: tag };
  } catch {
    return { success: false, error: "Erro ao criar tag (nome já existe?)" };
  }
}

export async function deleteTag(tagId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.tag.delete({ where: { id: tagId, userId: user.id } });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao deletar tag" };
  }
}
