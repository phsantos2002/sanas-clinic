"use server";

import { revalidatePath } from "next/cache";
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

// ─── Save WAHA config ───
// Server URL e API Key vêm de variáveis de ambiente (configuradas pelo admin).
// O nome da sessão é gerado automaticamente a partir do ID do usuário.
// O usuário final só precisa clicar "Conectar" e escanear o QR Code.

export async function saveWahaConfig(): Promise<ActionResult<{ qrcode?: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const serverUrl = process.env.WAHA_SERVER_URL;
    const apiKey = process.env.WAHA_API_KEY;

    if (!serverUrl || !apiKey) {
      return { success: false, error: "WAHA não configurado no servidor. Contate o administrador." };
    }

    // WAHA Core (free) só suporta sessão "default"
    const sessionName = "default";

    const { createWahaSession } = await import("@/services/whatsappEvolution");

    // Build webhook URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const webhookUrl = `${baseUrl}/api/webhook/evolution`;

    // Create session (handles "already exists" internally)
    const createResult = await createWahaSession(serverUrl, apiKey, sessionName, webhookUrl);

    if (!createResult.success) {
      return { success: false, error: createResult.error ?? "Erro ao criar sessão" };
    }

    // Save config
    await prisma.whatsAppConfig.upsert({
      where: { userId: dbUser.id },
      update: {
        provider: "waha",
        wahaServerUrl: serverUrl,
        wahaApiKey: apiKey,
        wahaSessionName: sessionName,
      },
      create: {
        userId: dbUser.id,
        provider: "waha",
        wahaServerUrl: serverUrl,
        wahaApiKey: apiKey,
        wahaSessionName: sessionName,
      },
    });

    return { success: true, data: { qrcode: createResult.qrcode } };
  } catch {
    return { success: false, error: "Erro ao salvar configuração WAHA" };
  }
}

// ─── Get QR Code (WAHA) ───

export async function getWahaQR(): Promise<ActionResult<{ qrcode: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "waha") {
      return { success: false, error: "WAHA não configurado" };
    }

    if (!config.wahaServerUrl || !config.wahaApiKey || !config.wahaSessionName) {
      return { success: false, error: "Configuração incompleta" };
    }

    const { getWahaQRCode } = await import("@/services/whatsappEvolution");
    const result = await getWahaQRCode({
      serverUrl: config.wahaServerUrl,
      apiKey: config.wahaApiKey,
      sessionName: config.wahaSessionName,
    });

    if (!result.success || !result.qrcode) {
      return { success: false, error: result.error ?? "QR Code não disponível" };
    }

    return { success: true, data: { qrcode: result.qrcode } };
  } catch {
    return { success: false, error: "Erro ao obter QR Code" };
  }
}

// ─── Connection status (WAHA) ───

export async function getWahaStatus(): Promise<ActionResult<{ connected: boolean; state?: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "waha") {
      return { success: false, error: "WAHA não configurado" };
    }

    if (!config.wahaServerUrl || !config.wahaApiKey || !config.wahaSessionName) {
      return { success: false, error: "Configuração incompleta" };
    }

    const { getWahaConnectionStatus } = await import("@/services/whatsappEvolution");
    const result = await getWahaConnectionStatus({
      serverUrl: config.wahaServerUrl,
      apiKey: config.wahaApiKey,
      sessionName: config.wahaSessionName,
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

    if (config.provider === "waha") {
      const status = await getWahaStatus();
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

// ─── Disconnect WAHA session ───

export async function disconnectWaha(): Promise<ActionResult> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "waha") {
      return { success: false, error: "WAHA não configurado" };
    }

    if (config.wahaServerUrl && config.wahaApiKey && config.wahaSessionName) {
      // WAHA Core não permite deletar "default", apenas parar
      const { stopWahaSession } = await import("@/services/whatsappEvolution");
      await stopWahaSession({
        serverUrl: config.wahaServerUrl,
        apiKey: config.wahaApiKey,
        sessionName: config.wahaSessionName,
      });
    }

    // Limpar config WAHA do banco
    await prisma.whatsAppConfig.update({
      where: { userId: dbUser.id },
      data: {
        provider: "official",
        wahaSessionName: null,
        wahaServerUrl: null,
        wahaApiKey: null,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao desconectar" };
  }
}

// ─── Sync WhatsApp chats → leads + messages ───

export async function syncWhatsAppChats(): Promise<ActionResult<{ imported: number; messagesImported: number }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "waha" || !config.wahaServerUrl || !config.wahaApiKey || !config.wahaSessionName) {
      return { success: false, error: "WAHA não configurado" };
    }

    const { getWahaChats, getWahaChatMessages } = await import("@/services/whatsappEvolution");

    const wahaConfig = {
      serverUrl: config.wahaServerUrl,
      apiKey: config.wahaApiKey,
      sessionName: config.wahaSessionName,
    };

    // 1. Fetch all chats
    const chatsResult = await getWahaChats(wahaConfig);
    if (!chatsResult.success || !chatsResult.chats) {
      return { success: false, error: chatsResult.error ?? "Erro ao buscar chats" };
    }

    // Filter: only personal chats (not groups), with a name, sorted by most recent
    const personalChats = chatsResult.chats
      .filter((c) => !c.isGroup && c.name && c.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 80); // Limit to avoid Vercel timeout

    // Get first stage for new leads
    const firstStage = await prisma.stage.findFirst({
      where: { userId: dbUser.id },
      orderBy: { order: "asc" },
    });

    let imported = 0;
    let messagesImported = 0;

    for (const chat of personalChats) {
      const chatId = chat.id._serialized;

      // Extract phone: @c.us has the number, @lid uses the lid ID
      let phone: string;
      if (chat.id.server === "c.us") {
        phone = chat.id.user;
      } else {
        // @lid format: try to get phone from name, otherwise use lid ID as identifier
        const nameDigits = chat.name.replace(/[^\d]/g, "");
        phone = nameDigits.length >= 10 ? nameDigits : `lid-${chat.id.user}`;
      }

      // Check if lead already exists (by phone suffix or exact lid match)
      const isLid = phone.startsWith("lid-");
      const existingLead = await prisma.lead.findFirst({
        where: {
          userId: dbUser.id,
          phone: isLid ? phone : { endsWith: phone.slice(-9) },
        },
      });

      let leadId: string;

      if (existingLead) {
        leadId = existingLead.id;
        // Update name if current name is just a phone number
        if (/^[\d\s\-+()]+$/.test(existingLead.name) && !/^[\d\s\-+()]+$/.test(chat.name)) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: { name: chat.name },
          });
        }
      } else {
        // Create new lead
        const newLead = await prisma.lead.create({
          data: {
            name: chat.name,
            phone,
            userId: dbUser.id,
            stageId: firstStage?.id ?? null,
            source: "whatsapp",
            platform: "whatsapp",
            medium: "organic",
          },
        });

        if (firstStage) {
          await prisma.leadStageHistory.create({
            data: { leadId: newLead.id, stageId: firstStage.id },
          });
        }

        leadId = newLead.id;
        imported++;
      }

      // 2. Fetch messages for this chat (only if lead has none yet)
      const existingMsgCount = await prisma.message.count({ where: { leadId } });
      if (existingMsgCount > 0) continue;

      const msgsResult = await getWahaChatMessages(wahaConfig, chatId, 50);
      if (!msgsResult.success || !msgsResult.messages) continue;

      const messagesToCreate = msgsResult.messages
        .filter((m) => m.body && m.body.trim())
        .map((m) => ({
          leadId,
          role: m.fromMe ? "assistant" : "user",
          content: m.body,
          createdAt: new Date(m.timestamp * 1000),
        }));

      if (messagesToCreate.length > 0) {
        await prisma.message.createMany({ data: messagesToCreate });
        messagesImported += messagesToCreate.length;
      }
    }

    revalidatePath("/dashboard/chat");
    revalidatePath("/dashboard/pipeline");
    revalidatePath("/dashboard/overview");

    return { success: true, data: { imported, messagesImported } };
  } catch (err) {
    console.error("[syncWhatsAppChats] Erro:", err);
    return { success: false, error: "Erro ao sincronizar chats" };
  }
}
