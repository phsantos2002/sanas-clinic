"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function getWhatsAppConfig() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return null;

  return prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
}

export async function saveWhatsAppConfig(
  phoneNumberId: string,
  accessToken: string,
  verifyToken: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return { success: false, error: "Usuário não encontrado" };

    await prisma.whatsAppConfig.upsert({
      where: { userId: dbUser.id },
      update: { phoneNumberId, accessToken, verifyToken },
      create: { userId: dbUser.id, phoneNumberId, accessToken, verifyToken },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Erro ao salvar configuração" };
  }
}

export async function getWhatsAppConfigByUserId(userId: string) {
  return prisma.whatsAppConfig.findUnique({ where: { userId } });
}

export async function testWhatsAppConnection(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autenticado" };

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return { success: false, error: "Usuário não encontrado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config) return { success: false, error: "WhatsApp não configurado" };

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.phoneNumberId}?access_token=${config.accessToken}`
    );

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message ?? "Falha na conexão" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao testar conexão" };
  }
}
