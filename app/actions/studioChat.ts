"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export async function createStudioProject(data: {
  title: string;
  type?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const project = await prisma.studioProject.create({
    data: { userId: user.id, title: data.title, type: data.type || "single_post" },
  });

  revalidatePath("/dashboard/studio");
  return { success: true, data: { id: project.id } };
}

export async function getStudioProjects() {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.studioProject.findMany({
    where: { userId: user.id },
    include: { _count: { select: { chatMessages: true, posts: true } } },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
}

export async function getStudioProject(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  return prisma.studioProject.findFirst({
    where: { id, userId: user.id },
    include: {
      chatMessages: { orderBy: { createdAt: "asc" } },
      posts: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function sendStudioMessage(
  projectId: string,
  message: string
): Promise<ActionResult<{ reply: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const project = await prisma.studioProject.findFirst({
    where: { id: projectId, userId: user.id },
    include: { chatMessages: { orderBy: { createdAt: "asc" }, take: 15 } },
  });
  if (!project) return { success: false, error: "Projeto nao encontrado" };

  // Save user message
  await prisma.studioChatMessage.create({
    data: { projectId, role: "user", content: message },
  });

  // Get assets for context
  const assets = await prisma.assetVault.findMany({
    where: { userId: user.id },
    select: { category: true, name: true, description: true, metadata: true, personName: true },
    take: 20,
  });

  const config = await prisma.aIConfig.findUnique({ where: { userId: user.id } });
  if (!config?.apiKey) return { success: false, error: "Chave OpenAI nao configurada" };

  const brand = (config.brandIdentity as Record<string, string>) || {};
  const profile = (config.businessProfile as Record<string, string>) || {};

  const systemPrompt = `Voce e o diretor criativo da "${profile.name || config.clinicName}".
Nicho: ${profile.niche || brand.business_type || "servicos"}.
Servicos: ${profile.services || "diversos"}.
Tom: ${brand.default_tone || "profissional"}.
Publico: ${brand.target_audience || "geral"}.

ACERVO DISPONIVEL:
${assets.map((a) => `- [${a.category}] ${a.name}: ${a.description || ""} ${a.personName ? `(${a.personName})` : ""}`).join("\n")}

REGRAS:
1. Responda em portugues brasileiro
2. Gere conteudo PRONTO para publicar (caption completa, hashtags, roteiro)
3. Adapte por plataforma quando pedido (Instagram, TikTok, Facebook, LinkedIn)
4. Use dados do acervo para personalizar (nomes, procedimentos, precos)
5. Para video: gere roteiro cena por cena com visual, fala e duracao
6. Seja direto e criativo`;

  const messages = [
    ...project.chatMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const reply = data.choices[0].message.content;

    await prisma.studioChatMessage.create({
      data: { projectId, role: "assistant", content: reply },
    });

    await prisma.studioProject.update({
      where: { id: projectId },
      data: { status: "in_progress" },
    });

    revalidatePath("/dashboard/studio");
    return { success: true, data: { reply } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro no chat" };
  }
}

export async function deleteStudioProject(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  await prisma.studioProject.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/studio");
  return { success: true };
}
