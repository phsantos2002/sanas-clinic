"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireManagerContext } from "@/lib/authGuard";
import { resolveSession } from "@/app/actions/user";
import type { ActionResult } from "@/types";

/**
 * Multi-conexão WhatsApp — CRUD e pareamento por conexão.
 * Provider não-oficial: Evolution API (Baileys). Instância nomeada
 * sanas-<userId8>-<attendantId8|default>; webhook registrado na criação.
 */

export type ConnectionData = {
  id: string;
  label: string;
  provider: string;
  phoneNumber: string | null;
  attendantId: string | null;
  attendantName: string | null;
  isDefault: boolean;
  isActive: boolean;
  aiEnabled: boolean;
  status: string;
  createdAt: Date;
};

function getEvolutionEnv(): { serverUrl: string; apiKey: string } | null {
  const serverUrl = (process.env.EVOLUTION_SERVER_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.EVOLUTION_API_KEY || "").trim();
  if (!serverUrl || !apiKey) return null;
  return { serverUrl, apiKey };
}

export async function getConnections(): Promise<ConnectionData[]> {
  const ctx = await resolveSession();
  if (!ctx) return [];

  const { listConnections } = await import("@/services/connections");
  const conns = await listConnections(ctx.tenantId);
  return conns.map((c) => ({
    id: c.id,
    label: c.label,
    provider: c.provider,
    phoneNumber: c.phoneNumber,
    attendantId: c.attendantId,
    attendantName: c.attendant?.name ?? null,
    isDefault: c.isDefault,
    isActive: c.isActive,
    aiEnabled: c.aiEnabled,
    status: c.status,
    createdAt: c.createdAt,
  }));
}

/**
 * Cria uma conexão Evolution (Baileys) e retorna o QR para pareamento.
 * attendantId null = número compartilhado do tenant.
 */
export async function createConnection(data: {
  label: string;
  attendantId?: string | null;
}): Promise<ActionResult<{ id: string; qrcode?: string }>> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  if (!data.label?.trim()) return { success: false, error: "Nome da conexao obrigatorio" };

  const evo = getEvolutionEnv();
  if (!evo) {
    return {
      success: false,
      error: "Evolution nao configurada no servidor (EVOLUTION_SERVER_URL / EVOLUTION_API_KEY).",
    };
  }

  // Valida o vendedor (se informado) e evita duplicar conexão por vendedor
  const attendantId = data.attendantId || null;
  if (attendantId) {
    const attendant = await prisma.attendant.findFirst({
      where: { id: attendantId, userId: ctx.tenantId },
    });
    if (!attendant) return { success: false, error: "Vendedor nao encontrado" };

    const dup = await prisma.whatsAppConnection.findFirst({
      where: { userId: ctx.tenantId, attendantId, isActive: true },
    });
    if (dup) return { success: false, error: "Este vendedor ja tem uma conexao ativa" };
  }

  const suffix = attendantId ? attendantId.slice(0, 8) : "default";
  const instanceName = `sanas-${ctx.tenantId.slice(0, 8)}-${suffix}`;

  const { createEvolutionInstance, connectEvolutionInstance, setEvolutionWebhook } = await import(
    "@/services/whatsappEvolution"
  );

  const created = await createEvolutionInstance(evo.serverUrl, evo.apiKey, instanceName);
  if (!created.success) {
    return { success: false, error: created.error ?? "Erro ao criar instância Evolution" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const webhook = await setEvolutionWebhook(
    evo.serverUrl,
    evo.apiKey,
    instanceName,
    `${baseUrl}/api/webhook/evolution`
  );
  if (!webhook.success) {
    // Webhook é o caminho do inbound — sem ele a conexão fica surda. Falha explícita.
    return { success: false, error: `Falha ao registrar webhook: ${webhook.error ?? "erro"}` };
  }

  let qrcode = created.qrcode;
  if (!qrcode) {
    const conn = await connectEvolutionInstance(evo.serverUrl, evo.apiKey, instanceName);
    qrcode = conn.qrcode;
  }

  // Primeira conexão do tenant vira default automaticamente
  const hasAny = await prisma.whatsAppConnection.findFirst({ where: { userId: ctx.tenantId } });

  const connection = await prisma.whatsAppConnection.upsert({
    where: { instanceName },
    update: {
      label: data.label.trim(),
      attendantId,
      isActive: true,
      status: "connecting",
      lastStatusAt: new Date(),
    },
    create: {
      userId: ctx.tenantId,
      label: data.label.trim(),
      provider: "evolution",
      serverUrl: evo.serverUrl,
      instanceToken: evo.apiKey,
      instanceName,
      attendantId,
      isDefault: !hasAny,
      status: "connecting",
      lastStatusAt: new Date(),
    },
  });

  revalidatePath("/dashboard/settings");
  return { success: true, data: { id: connection.id, qrcode } };
}

/** QR para (re)parear uma conexão existente. */
export async function getConnectionQR(
  connectionId: string
): Promise<ActionResult<{ qrcode: string }>> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  const conn = await prisma.whatsAppConnection.findFirst({
    where: { id: connectionId, userId: ctx.tenantId },
  });
  if (!conn || !conn.serverUrl || !conn.instanceToken || !conn.instanceName) {
    return { success: false, error: "Conexao nao encontrada" };
  }

  const { connectEvolutionInstance } = await import("@/services/whatsappEvolution");
  const result = await connectEvolutionInstance(conn.serverUrl, conn.instanceToken, conn.instanceName);
  if (!result.success || !result.qrcode) {
    return { success: false, error: result.error ?? "QR Code nao disponivel" };
  }
  return { success: true, data: { qrcode: result.qrcode } };
}

/** Status da conexão (atualiza o cache em banco). */
export async function getConnectionStatus(
  connectionId: string
): Promise<ActionResult<{ connected: boolean; state?: string }>> {
  const ctx = await resolveSession();
  if (!ctx) return { success: false, error: "Nao autenticado" };

  const conn = await prisma.whatsAppConnection.findFirst({
    where: { id: connectionId, userId: ctx.tenantId },
  });
  if (!conn || !conn.serverUrl || !conn.instanceToken || !conn.instanceName) {
    return { success: false, error: "Conexao nao encontrada" };
  }

  const { getEvolutionState } = await import("@/services/whatsappEvolution");
  const result = await getEvolutionState(conn.serverUrl, conn.instanceToken, conn.instanceName);

  await prisma.whatsAppConnection
    .update({
      where: { id: conn.id },
      data: {
        status: result.connected ? "connected" : (result.state ?? "disconnected"),
        lastStatusAt: new Date(),
      },
    })
    .catch(() => {});

  return { success: true, data: { connected: result.connected, state: result.state } };
}

/** Desconecta (logout) e desativa a conexão. */
export async function disconnectConnection(connectionId: string): Promise<ActionResult> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  const conn = await prisma.whatsAppConnection.findFirst({
    where: { id: connectionId, userId: ctx.tenantId },
  });
  if (!conn) return { success: false, error: "Conexao nao encontrada" };

  if (conn.serverUrl && conn.instanceToken && conn.instanceName) {
    const { logoutEvolutionInstance } = await import("@/services/whatsappEvolution");
    await logoutEvolutionInstance(conn.serverUrl, conn.instanceToken, conn.instanceName).catch(
      () => {}
    );
  }

  await prisma.whatsAppConnection.update({
    where: { id: conn.id },
    data: { isActive: false, status: "disconnected", lastStatusAt: new Date() },
  });

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/** Define a conexão default do tenant (fallback de envio). */
export async function setDefaultConnection(connectionId: string): Promise<ActionResult> {
  const ctx = await requireManagerContext();
  if (!ctx) return { success: false, error: "Sem permissao" };

  const conn = await prisma.whatsAppConnection.findFirst({
    where: { id: connectionId, userId: ctx.tenantId },
  });
  if (!conn) return { success: false, error: "Conexao nao encontrada" };

  await prisma.$transaction([
    prisma.whatsAppConnection.updateMany({
      where: { userId: ctx.tenantId },
      data: { isDefault: false },
    }),
    prisma.whatsAppConnection.update({ where: { id: conn.id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/dashboard/settings");
  return { success: true };
}
