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

export async function saveSelectedCampaign(
  campaignId: string | null
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  try {
    await prisma.pixel.update({
      where: { userId: user.id },
      data: { selectedCampaignId: campaignId || null },
    });
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/meta");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar campanha" };
  }
}

export async function testPixelConnection(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const pixel = await prisma.pixel.findUnique({ where: { userId: user.id } });
    if (!pixel) return { success: false, error: "Pixel não configurado" };

    // Send a test event
    const payload = {
      data: [
        {
          event_name: "TestEvent",
          event_time: Math.floor(Date.now() / 1000),
          user_data: { ph: ["0000000000000000000000000000000000000000000000000000000000000000"] },
          action_source: "system_generated",
        },
      ],
      test_event_code: "TEST" + Date.now().toString().slice(-5),
    };

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${pixel.pixelId}/events?access_token=${pixel.accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message ?? "Falha no teste do Pixel" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao testar Pixel" };
  }
}
