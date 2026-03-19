"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

// ─── Helpers ───

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.user.findUnique({ where: { email: user.email! } });
}

// ─── Get config ───

export async function getWhatsAppConfig() {
  const dbUser = await getAuthenticatedUser();
  if (!dbUser) return null;
  return prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
}

export async function getWhatsAppConfigByUserId(userId: string) {
  return prisma.whatsAppConfig.findUnique({ where: { userId } });
}

// ─── Save Official API config (mantido) ───

export async function saveWhatsAppConfig(
  phoneNumberId: string,
  accessToken: string,
  verifyToken: string
): Promise<ActionResult<void>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    await prisma.whatsAppConfig.upsert({
      where: { userId: dbUser.id },
      update: { provider: "official", phoneNumberId, accessToken, verifyToken },
      create: { userId: dbUser.id, provider: "official", phoneNumberId, accessToken, verifyToken },
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Erro ao salvar configuração" };
  }
}

// ─── Save Evolution API config ───
// Server URL e API Key vêm de variáveis de ambiente (configuradas pelo admin).
// O nome da instância é gerado automaticamente a partir do ID do usuário.
// O usuário final só precisa clicar "Conectar" e escanear o QR Code.

export async function saveEvolutionConfig(): Promise<ActionResult<{ instanceId?: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const serverUrl = process.env.EVOLUTION_SERVER_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!serverUrl || !apiKey) {
      return { success: false, error: "Evolution API não configurada no servidor. Contate o administrador." };
    }

    // Gera nome da instância automaticamente: "lux-<userId_curto>"
    const instanceName = `lux-${dbUser.id.slice(0, 8)}`;

    // Create instance on Evolution server (or reuse if already exists)
    const { createEvolutionInstance, setEvolutionWebhook } = await import("@/services/whatsappEvolution");

    const createResult = await createEvolutionInstance(serverUrl, apiKey, instanceName);
    // If instance already exists, that's fine — just proceed
    if (!createResult.success && !createResult.error?.includes("already in use")) {
      return { success: false, error: createResult.error ?? "Erro ao criar instância" };
    }

    // Set webhook URL pointing to our Evolution webhook endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    await setEvolutionWebhook(
      { serverUrl, apiKey, instanceName },
      `${baseUrl}/api/webhook/evolution`,
    );

    // Save config
    await prisma.whatsAppConfig.upsert({
      where: { userId: dbUser.id },
      update: {
        provider: "evolution",
        evolutionServerUrl: serverUrl,
        evolutionApiKey: apiKey,
        evolutionInstanceName: instanceName,
        evolutionInstanceId: createResult.instanceId ?? null,
      },
      create: {
        userId: dbUser.id,
        provider: "evolution",
        evolutionServerUrl: serverUrl,
        evolutionApiKey: apiKey,
        evolutionInstanceName: instanceName,
        evolutionInstanceId: createResult.instanceId ?? null,
      },
    });

    return { success: true, data: { instanceId: createResult.instanceId } };
  } catch {
    return { success: false, error: "Erro ao salvar configuração Evolution" };
  }
}

// ─── Get QR Code (Evolution) ───

export async function getEvolutionQR(): Promise<ActionResult<{ qrcode: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "evolution") {
      return { success: false, error: "Evolution API não configurada" };
    }

    if (!config.evolutionServerUrl || !config.evolutionApiKey || !config.evolutionInstanceName) {
      return { success: false, error: "Configuração incompleta" };
    }

    const { getEvolutionQRCode } = await import("@/services/whatsappEvolution");
    const result = await getEvolutionQRCode({
      serverUrl: config.evolutionServerUrl,
      apiKey: config.evolutionApiKey,
      instanceName: config.evolutionInstanceName,
    });

    if (!result.success || !result.qrcode) {
      return { success: false, error: result.error ?? "QR Code não disponível" };
    }

    return { success: true, data: { qrcode: result.qrcode } };
  } catch {
    return { success: false, error: "Erro ao obter QR Code" };
  }
}

// ─── Connection status (Evolution) ───

export async function getEvolutionStatus(): Promise<ActionResult<{ connected: boolean; state?: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "evolution") {
      return { success: false, error: "Evolution API não configurada" };
    }

    if (!config.evolutionServerUrl || !config.evolutionApiKey || !config.evolutionInstanceName) {
      return { success: false, error: "Configuração incompleta" };
    }

    const { getEvolutionConnectionStatus } = await import("@/services/whatsappEvolution");
    const result = await getEvolutionConnectionStatus({
      serverUrl: config.evolutionServerUrl,
      apiKey: config.evolutionApiKey,
      instanceName: config.evolutionInstanceName,
    });

    return { success: true, data: { connected: result.connected, state: result.state } };
  } catch {
    return { success: false, error: "Erro ao verificar status" };
  }
}

// ─── Test Official API connection (mantido) ───

export async function testWhatsAppConnection(): Promise<ActionResult> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config) return { success: false, error: "WhatsApp não configurado" };

    if (config.provider === "evolution") {
      // Test Evolution connection
      const status = await getEvolutionStatus();
      if (!status.success) return status;
      if (status.data?.connected) {
        return { success: true };
      }
      return { success: false, error: `Não conectado (estado: ${status.data?.state ?? "desconhecido"})` };
    }

    // Test Official API
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

// ─── Disconnect Evolution instance ───

export async function disconnectEvolution(): Promise<ActionResult> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "evolution") {
      return { success: false, error: "Evolution API não configurada" };
    }

    if (config.evolutionServerUrl && config.evolutionApiKey && config.evolutionInstanceName) {
      const { deleteEvolutionInstance } = await import("@/services/whatsappEvolution");
      await deleteEvolutionInstance({
        serverUrl: config.evolutionServerUrl,
        apiKey: config.evolutionApiKey,
        instanceName: config.evolutionInstanceName,
      });
    }

    // Remove evolution fields but keep record
    await prisma.whatsAppConfig.update({
      where: { userId: dbUser.id },
      data: {
        evolutionInstanceName: null,
        evolutionInstanceId: null,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao desconectar" };
  }
}
