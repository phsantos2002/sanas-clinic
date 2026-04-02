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

// ─── Save Official API config ───

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

// ─── Save Uazapi config ───

export async function saveUazapiConfig(): Promise<ActionResult<{ qrcode?: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const serverUrl = process.env.UAZAPI_SERVER_URL;
    const adminToken = process.env.UAZAPI_ADMIN_TOKEN;

    if (!serverUrl || !adminToken) {
      return { success: false, error: "Uazapi não configurado no servidor. Contate o administrador." };
    }

    const { createUazapiInstance, connectUazapiInstance, setUazapiWebhook } =
      await import("@/services/whatsappUazapi");

    const instanceName = `sanas-${dbUser.id.slice(0, 8)}`;

    // Check if user already has a config with instance token
    const existing = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    let instanceToken = existing?.uazapiInstanceToken;

    if (!instanceToken) {
      // Check if instance already exists on Uazapi (avoid duplicates)
      const allInstances = await fetch(`${serverUrl}/instance/all`, {
        headers: { admintoken: adminToken },
      }).then(r => r.json()).catch(() => []);

      const existingInstance = Array.isArray(allInstances)
        ? allInstances.find((i: { name: string; token: string }) => i.name === instanceName)
        : null;

      if (existingInstance) {
        instanceToken = existingInstance.token;
      } else {
        // Create new instance
        const createResult = await createUazapiInstance(serverUrl, adminToken, instanceName);
        if (!createResult.success || !createResult.token) {
          return { success: false, error: createResult.error ?? "Erro ao criar instância" };
        }
        instanceToken = createResult.token;
      }
    }

    if (!instanceToken) {
      return { success: false, error: "Não foi possível obter token da instância" };
    }

    // Configure webhook
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    await setUazapiWebhook(serverUrl, instanceToken, `${baseUrl}/api/webhook/evolution`);

    // Connect and get QR code
    const connectResult = await connectUazapiInstance(serverUrl, instanceToken);

    // Save config
    await prisma.whatsAppConfig.upsert({
      where: { userId: dbUser.id },
      update: {
        provider: "uazapi",
        uazapiServerUrl: serverUrl,
        uazapiAdminToken: adminToken,
        uazapiInstanceToken: instanceToken,
        uazapiInstanceName: instanceName,
      },
      create: {
        userId: dbUser.id,
        provider: "uazapi",
        uazapiServerUrl: serverUrl,
        uazapiAdminToken: adminToken,
        uazapiInstanceToken: instanceToken,
        uazapiInstanceName: instanceName,
      },
    });

    return { success: true, data: { qrcode: connectResult.qrcode } };
  } catch {
    return { success: false, error: "Erro ao salvar configuração Uazapi" };
  }
}

// ─── Get QR Code (Uazapi) ───

export async function getUazapiQR(): Promise<ActionResult<{ qrcode: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "uazapi" || !config.uazapiServerUrl || !config.uazapiInstanceToken) {
      return { success: false, error: "Uazapi não configurado" };
    }

    const { connectUazapiInstance } = await import("@/services/whatsappUazapi");
    const result = await connectUazapiInstance(config.uazapiServerUrl, config.uazapiInstanceToken);

    if (!result.success || !result.qrcode) {
      return { success: false, error: result.error ?? "QR Code não disponível" };
    }

    return { success: true, data: { qrcode: result.qrcode } };
  } catch {
    return { success: false, error: "Erro ao obter QR Code" };
  }
}

// ─── Connection status (Uazapi) ───

export async function getUazapiStatus(): Promise<ActionResult<{ connected: boolean; state?: string }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "uazapi" || !config.uazapiServerUrl || !config.uazapiInstanceToken) {
      return { success: false, error: "Uazapi não configurado" };
    }

    const { getUazapiStatus: getStatus } = await import("@/services/whatsappUazapi");
    const result = await getStatus(config.uazapiServerUrl, config.uazapiInstanceToken);

    return { success: true, data: { connected: result.connected, state: result.status } };
  } catch {
    return { success: false, error: "Erro ao verificar status" };
  }
}

// ─── Test connection ───

export async function testWhatsAppConnection(): Promise<ActionResult> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config) return { success: false, error: "WhatsApp não configurado" };

    if (config.provider === "uazapi") {
      const status = await getUazapiStatus();
      if (!status.success) return status;
      if (status.data?.connected) return { success: true };
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

// ─── Disconnect Uazapi ───

export async function disconnectUazapi(): Promise<ActionResult> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "uazapi") {
      return { success: false, error: "Uazapi não configurado" };
    }

    if (config.uazapiServerUrl && config.uazapiInstanceToken) {
      const { disconnectUazapiInstance } = await import("@/services/whatsappUazapi");
      await disconnectUazapiInstance(config.uazapiServerUrl, config.uazapiInstanceToken);
    }

    await prisma.whatsAppConfig.update({
      where: { userId: dbUser.id },
      data: {
        provider: "official",
        uazapiInstanceToken: null,
        uazapiInstanceName: null,
        uazapiServerUrl: null,
        uazapiAdminToken: null,
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
    if (!config || config.provider !== "uazapi" || !config.uazapiServerUrl || !config.uazapiInstanceToken) {
      return { success: false, error: "Uazapi não configurado" };
    }

    const { getUazapiChats } = await import("@/services/whatsappUazapi");
    const { sendFacebookEvent } = await import("@/services/facebookEvents");

    const serverUrl = config.uazapiServerUrl;
    const token = config.uazapiInstanceToken;

    // Fetch chats (sorted by most recent)
    const chatsResult = await getUazapiChats(serverUrl, token, { limit: 200 });
    if (!chatsResult.success || !chatsResult.chats) {
      return { success: false, error: chatsResult.error ?? "Erro ao buscar chats" };
    }

    const firstStage = await prisma.stage.findFirst({
      where: { userId: dbUser.id },
      orderBy: { order: "asc" },
    });

    let imported = 0;
    let messagesImported = 0;

    for (const chat of chatsResult.chats) {
      if (chat.wa_isGroup) continue;
      if (!chat.wa_chatid) continue;

      // Extract phone from wa_chatid ("5511999999999@s.whatsapp.net")
      const phone = chat.wa_chatid.split("@")[0]?.replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;

      const name = chat.wa_contactName || chat.phone || phone;
      // Uazapi timestamps are in milliseconds
      const chatDate = chat.wa_lastMsgTimestamp
        ? new Date(chat.wa_lastMsgTimestamp)
        : new Date();

      // Check if lead already exists
      const phoneSuffix = phone.slice(-9);
      const existingLead = await prisma.lead.findFirst({
        where: { userId: dbUser.id, phone: { endsWith: phoneSuffix } },
      });

      if (existingLead) {
        // Update name if needed
        if (/^[\d\s\-+()]+$/.test(existingLead.name) && !/^[\d\s\-+()]+$/.test(name)) {
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: { name, updatedAt: chatDate },
          });
        }
        continue;
      }

      // Create new lead
      const newLead = await prisma.lead.create({
        data: {
          name,
          phone,
          userId: dbUser.id,
          stageId: firstStage?.id ?? null,
          source: "whatsapp",
          platform: "whatsapp",
          medium: "organic",
          updatedAt: chatDate,
        },
      });

      if (firstStage) {
        await prisma.leadStageHistory.create({
          data: { leadId: newLead.id, stageId: firstStage.id },
        });
        await sendFacebookEvent({
          userId: dbUser.id,
          phone,
          eventName: firstStage.eventName,
          leadId: newLead.id,
          stageName: firstStage.name,
        });
      }

      imported++;
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

// ─── Sync messages in batches ───

export async function syncWhatsAppMessages(): Promise<ActionResult<{ messagesImported: number; remaining: number }>> {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) return { success: false, error: "Não autenticado" };

    const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
    if (!config || config.provider !== "uazapi" || !config.uazapiServerUrl || !config.uazapiInstanceToken) {
      return { success: false, error: "Uazapi não configurado" };
    }

    const { getUazapiMessages } = await import("@/services/whatsappUazapi");
    const serverUrl = config.uazapiServerUrl;
    const token = config.uazapiInstanceToken;

    // Find leads without messages (batch of 10)
    const leadsWithoutMessages = await prisma.lead.findMany({
      where: { userId: dbUser.id, messages: { none: {} } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    if (leadsWithoutMessages.length === 0) {
      return { success: true, data: { messagesImported: 0, remaining: 0 } };
    }

    let messagesImported = 0;

    for (const lead of leadsWithoutMessages) {
      // Skip leads with lid- phone (old WAHA format, can't match in Uazapi)
      if (lead.phone.startsWith("lid-")) continue;

      const chatId = `${lead.phone}@s.whatsapp.net`;
      const msgsResult = await getUazapiMessages(serverUrl, token, chatId, { limit: 30 });
      if (!msgsResult.success || !msgsResult.messages) continue;

      const messagesToCreate = msgsResult.messages
        .filter((m) => m.text && m.text.trim().length > 0)
        .map((m) => ({
          leadId: lead.id,
          role: m.fromMe ? "assistant" : "user",
          content: m.text,
          createdAt: new Date(m.messageTimestamp),
        }));

      if (messagesToCreate.length > 0) {
        await prisma.message.createMany({ data: messagesToCreate });
        messagesImported += messagesToCreate.length;

        const lastTs = messagesToCreate[messagesToCreate.length - 1].createdAt;
        await prisma.lead.update({
          where: { id: lead.id },
          data: { updatedAt: lastTs },
        });
      }
    }

    const remaining = await prisma.lead.count({
      where: { userId: dbUser.id, messages: { none: {} } },
    });

    revalidatePath("/dashboard/chat");
    revalidatePath("/dashboard/pipeline");

    return { success: true, data: { messagesImported, remaining } };
  } catch (err) {
    console.error("[syncWhatsAppMessages] Erro:", err);
    return { success: false, error: "Erro ao sincronizar mensagens" };
  }
}
