"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import { flowDefinitionSchema, type FlowDefinition } from "@/lib/chatbot/engine";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types";

export type ChatbotFlowSummary = {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  nodeCount: number;
  updatedAt: Date;
};

export async function listFlows(): Promise<ChatbotFlowSummary[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const rows = await prisma.chatbotFlow.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((r) => {
    const nodes = r.nodes as { nodes?: Record<string, unknown> } | null;
    const nodeCount = nodes?.nodes ? Object.keys(nodes.nodes).length : 0;
    return {
      id: r.id,
      name: r.name,
      trigger: r.trigger,
      isActive: r.isActive,
      nodeCount,
      updatedAt: r.updatedAt,
    };
  });
}

export async function getFlow(id: string): Promise<{
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  nodes: FlowDefinition;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const row = await prisma.chatbotFlow.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) return null;

  const parsed = flowDefinitionSchema.safeParse(row.nodes);
  if (!parsed.success) return null;
  return {
    id: row.id,
    name: row.name,
    trigger: row.trigger,
    isActive: row.isActive,
    nodes: parsed.data,
  };
}

export async function saveFlow(input: {
  id?: string;
  name: string;
  trigger: string;
  isActive: boolean;
  nodes: unknown;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const parsed = flowDefinitionSchema.safeParse(input.nodes);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Estrutura inválida" };
  }

  // Sanity check: all referenced node keys exist
  const allKeys = new Set(Object.keys(parsed.data.nodes));
  if (!allKeys.has(parsed.data.start)) {
    return { success: false, error: `Nó inicial "${parsed.data.start}" não existe` };
  }
  for (const [key, node] of Object.entries(parsed.data.nodes)) {
    if (node.next && !allKeys.has(node.next)) {
      return { success: false, error: `Nó "${key}" → "${node.next}" não existe` };
    }
    if (node.buttons) {
      for (const b of node.buttons) {
        if (!allKeys.has(b.next)) {
          return { success: false, error: `Botão em "${key}" → "${b.next}" não existe` };
        }
      }
    }
  }

  const data = {
    name: input.name.trim(),
    trigger: input.trigger.trim(),
    isActive: input.isActive,
    nodes: parsed.data,
  };

  let saved;
  if (input.id) {
    saved = await prisma.chatbotFlow.updateMany({
      where: { id: input.id, userId: user.id },
      data,
    });
    if (saved.count === 0) return { success: false, error: "Flow não encontrado" };
    logAudit({
      userId: user.id,
      action: "chatbot.flow_update",
      entityType: "ChatbotFlow",
      entityId: input.id,
    }).catch(() => {});
    revalidatePath("/dashboard/settings/ai");
    return { success: true, data: { id: input.id } };
  }

  const created = await prisma.chatbotFlow.create({
    data: { ...data, userId: user.id },
  });
  logAudit({
    userId: user.id,
    action: "chatbot.flow_create",
    entityType: "ChatbotFlow",
    entityId: created.id,
    metadata: { name: data.name, trigger: data.trigger },
  }).catch(() => {});
  revalidatePath("/dashboard/settings/ai");
  return { success: true, data: { id: created.id } };
}

export async function deleteFlow(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const result = await prisma.chatbotFlow.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) return { success: false, error: "Flow não encontrado" };

  logAudit({
    userId: user.id,
    action: "chatbot.flow_delete",
    entityType: "ChatbotFlow",
    entityId: id,
  }).catch(() => {});
  revalidatePath("/dashboard/settings/ai");
  return { success: true };
}

export async function toggleFlowActive(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const result = await prisma.chatbotFlow.updateMany({
    where: { id, userId: user.id },
    data: { isActive },
  });
  if (result.count === 0) return { success: false, error: "Flow não encontrado" };
  revalidatePath("/dashboard/settings/ai");
  return { success: true };
}
