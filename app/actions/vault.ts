"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export type AssetData = {
  id: string;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileName: string | null;
  fileSize: number | null;
  metadata: Record<string, unknown> | null;
  isVoiceSample: boolean;
  isFaceReference: boolean;
  personName: string | null;
  createdAt: Date;
};

export async function getAssets(category?: string): Promise<AssetData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const where: Record<string, unknown> = { userId: user.id };
  if (category) where.category = category;

  const assets = await prisma.assetVault.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return assets.map((a) => ({
    ...a,
    metadata: a.metadata as Record<string, unknown> | null,
  }));
}

export async function createAsset(data: {
  category: string;
  subcategory?: string;
  name: string;
  description?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  isVoiceSample?: boolean;
  isFaceReference?: boolean;
  personName?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const asset = await prisma.assetVault.create({
      data: {
        userId: user.id,
        category: data.category,
        subcategory: data.subcategory || null,
        name: data.name,
        description: data.description || null,
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : null,
        isVoiceSample: data.isVoiceSample || false,
        isFaceReference: data.isFaceReference || false,
        personName: data.personName || null,
      },
    });

    revalidatePath("/dashboard/studio");
    return { success: true, data: { id: asset.id } };
  } catch {
    return { success: false, error: "Erro ao criar asset" };
  }
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.assetVault.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/studio");
  return { success: true };
}

export async function getAssetStats() {
  const user = await getCurrentUser();
  if (!user) return null;

  const groups = await prisma.assetVault.groupBy({
    by: ["category"],
    where: { userId: user.id },
    _count: { id: true },
  });

  const stats: Record<string, number> = { person: 0, space: 0, procedure: 0, brand: 0, reference: 0 };
  for (const g of groups) stats[g.category] = g._count.id;
  return stats;
}
