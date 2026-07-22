import { prisma } from "@/lib/prisma";
import type { WhatsAppConnection } from "@prisma/client";

/**
 * Multi-conexão WhatsApp — resolução e roteamento de envio.
 *
 * Fonte de verdade: WhatsAppConnection (muitas por tenant, uma por vendedor).
 * WhatsAppConfig (1/tenant) permanece como fallback legado até a limpeza da
 * Fase 4 do plano.
 */

// Shape que services/whatsappService.ts:sendMessage espera (nomes legados).
export type SendConfig = {
  provider: string;
  phoneNumberId: string;
  accessToken: string;
  uazapiServerUrl: string | null;
  uazapiInstanceToken: string | null;
  uazapiInstanceName?: string | null;
};

/** Adapta uma WhatsAppConnection para o shape de envio unificado. */
export function connectionToSendConfig(conn: WhatsAppConnection): SendConfig {
  return {
    provider: conn.provider,
    phoneNumberId: conn.phoneNumberId ?? "",
    accessToken: conn.accessToken ?? "",
    uazapiServerUrl: conn.serverUrl,
    uazapiInstanceToken: conn.instanceToken,
    uazapiInstanceName: conn.instanceName,
  };
}

/** Resolve a conexão de um webhook não-oficial pelo nome da instância. */
export async function resolveConnectionByInstanceName(
  instanceName: string
): Promise<WhatsAppConnection | null> {
  if (!instanceName) return null;
  return prisma.whatsAppConnection.findUnique({ where: { instanceName } });
}

export async function listConnections(userId: string) {
  return prisma.whatsAppConnection.findMany({
    where: { userId },
    include: { attendant: { select: { id: true, name: true } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Escolhe a conexão de envio para um lead:
 *   1. lead.connectionId (continuidade — o número que o lead conhece), se ativa
 *   2. conexão do vendedor responsável (lead.assignedTo)
 *   3. conexão default do tenant
 *   4. fallback legado: WhatsAppConfig (shape já compatível)
 * Retorna null se nada configurado.
 */
export async function getSendConnection(lead: {
  userId: string;
  connectionId?: string | null;
  assignedTo?: string | null;
}): Promise<{ config: SendConfig; connectionId: string | null } | null> {
  // 1. Conexão do próprio lead
  if (lead.connectionId) {
    const conn = await prisma.whatsAppConnection.findFirst({
      where: { id: lead.connectionId, userId: lead.userId, isActive: true },
    });
    if (conn) return { config: connectionToSendConfig(conn), connectionId: conn.id };
  }

  // 2. Conexão do vendedor responsável
  if (lead.assignedTo) {
    const conn = await prisma.whatsAppConnection.findFirst({
      where: { userId: lead.userId, attendantId: lead.assignedTo, isActive: true },
    });
    if (conn) return { config: connectionToSendConfig(conn), connectionId: conn.id };
  }

  // 3. Default do tenant
  const def = await prisma.whatsAppConnection.findFirst({
    where: { userId: lead.userId, isDefault: true, isActive: true },
  });
  if (def) return { config: connectionToSendConfig(def), connectionId: def.id };

  // 3b. Qualquer conexão ativa (tenant sem default marcada)
  const any = await prisma.whatsAppConnection.findFirst({
    where: { userId: lead.userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (any) return { config: connectionToSendConfig(any), connectionId: any.id };

  // 4. Legado
  const legacy = await prisma.whatsAppConfig.findUnique({ where: { userId: lead.userId } });
  if (legacy) return { config: legacy, connectionId: null };

  return null;
}
