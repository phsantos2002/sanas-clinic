"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult, Pixel } from "@/types";

export async function getPixel(): Promise<Pixel | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.pixel.findUnique({ where: { userId: user.id } }) as any;
}

export async function savePixel(
  pixelId: string,
  accessToken: string,
  adAccountId?: string,
  metaAdsToken?: string
): Promise<ActionResult<Pixel>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    const pixel = await prisma.pixel.upsert({
      where: { userId: user.id },
      update: {
        pixelId: pixelId.trim(),
        accessToken: accessToken.trim(),
        adAccountId: adAccountId?.trim() || null,
        metaAdsToken: metaAdsToken?.trim() || null,
      },
      create: {
        pixelId: pixelId.trim(),
        accessToken: accessToken.trim(),
        adAccountId: adAccountId?.trim() || null,
        metaAdsToken: metaAdsToken?.trim() || null,
        userId: user.id,
      },
    });
    revalidatePath("/dashboard/settings");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { success: true, data: pixel as any };
  } catch {
    return { success: false, error: "Erro ao salvar pixel" };
  }
}
