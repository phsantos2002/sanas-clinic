"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

// ── Types ────────────────────────────────────────────────────

export type StoryData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  currentStage: string;
  videoType: string;
  targetDuration: number;
  tone: string | null;
  targetAudience: string | null;
  niche: string;
  scriptRaw: string | null;
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string | null;
  platforms: string[];
  scheduledAt: Date | null;
  publishedAt: Date | null;
  likes: number;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { characters: number; frames: number; videoClips: number; chatMessages: number };
};

// ── CRUD ─────────────────────────────────────────────────────

export async function createStory(data: {
  title: string;
  description?: string;
  videoType?: string;
  targetDuration?: number;
  tone?: string;
  targetAudience?: string;
  niche?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  if (!data.title?.trim()) return { success: false, error: "Titulo obrigatorio" };

  try {
    const story = await prisma.story.create({
      data: {
        userId: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        videoType: data.videoType || "reel",
        targetDuration: data.targetDuration || 30,
        tone: data.tone || null,
        targetAudience: data.targetAudience || null,
        niche: data.niche || "clinica_estetica",
      },
    });
    revalidatePath("/dashboard/social");
    return { success: true, data: { id: story.id } };
  } catch {
    return { success: false, error: "Erro ao criar story" };
  }
}

export async function getStory(storyId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  return prisma.story.findFirst({
    where: { id: storyId, userId: user.id },
    include: {
      chatMessages: { orderBy: { createdAt: "asc" } },
      characters: { orderBy: { createdAt: "asc" } },
      frames: { orderBy: { order: "asc" } },
      videoClips: { orderBy: { order: "asc" } },
    },
  });
}

export async function listStories(filters?: {
  status?: string;
  videoType?: string;
}): Promise<StoryData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const where: Record<string, unknown> = { userId: user.id };
  if (filters?.status) where.status = filters.status;
  if (filters?.videoType) where.videoType = filters.videoType;

  const stories = await prisma.story.findMany({
    where,
    include: {
      _count: { select: { characters: true, frames: true, videoClips: true, chatMessages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return stories as unknown as StoryData[];
}

export async function updateStory(storyId: string, data: {
  title?: string;
  description?: string;
  videoType?: string;
  targetDuration?: number;
  tone?: string;
  targetAudience?: string;
  niche?: string;
  caption?: string;
  hashtags?: string;
  platforms?: string[];
  scheduledAt?: string | null;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.story.updateMany({
      where: { id: storyId, userId: user.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.videoType !== undefined && { videoType: data.videoType }),
        ...(data.targetDuration !== undefined && { targetDuration: data.targetDuration }),
        ...(data.tone !== undefined && { tone: data.tone }),
        ...(data.targetAudience !== undefined && { targetAudience: data.targetAudience }),
        ...(data.niche !== undefined && { niche: data.niche }),
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
        ...(data.platforms !== undefined && { platforms: data.platforms }),
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        }),
      },
    });
    revalidatePath("/dashboard/social");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar story" };
  }
}

export async function deleteStory(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.story.deleteMany({ where: { id: storyId, userId: user.id } });
  revalidatePath("/dashboard/social");
  return { success: true };
}
