"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

// ── Types ────────────────────────────────────────────────────

export type SocialConnectionData = {
  id: string;
  platform: string;
  profileName: string | null;
  profilePicture: string | null;
  isActive: boolean;
  connectedAt: Date;
  tokenExpiresAt: Date | null;
};

export type SocialPostData = {
  id: string;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  mediaUrls: string[];
  mediaType: string | null;
  platforms: string[];
  scheduledAt: Date | null;
  publishedAt: Date | null;
  status: string;
  aiGenerated: boolean;
  aiCostEstimate: number | null;
  publishResults: Record<string, unknown> | null;
  engagementData: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

// ── Connections ──────────────────────────────────────────────

export async function getSocialConnections(): Promise<SocialConnectionData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const connections = await prisma.socialConnection.findMany({
    where: { userId: user.id },
    orderBy: { connectedAt: "desc" },
  });

  return connections.map((c) => ({
    id: c.id,
    platform: c.platform,
    profileName: c.profileName,
    profilePicture: c.profilePicture,
    isActive: c.isActive,
    connectedAt: c.connectedAt,
    tokenExpiresAt: c.tokenExpiresAt,
  }));
}

export async function saveSocialConnection(data: {
  platform: string;
  accessToken: string;
  refreshToken?: string;
  pageId?: string;
  profileName?: string;
  profilePicture?: string;
  tokenExpiresAt?: Date;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.socialConnection.upsert({
      where: {
        userId_platform: { userId: user.id, platform: data.platform },
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        pageId: data.pageId ?? null,
        profileName: data.profileName ?? null,
        profilePicture: data.profilePicture ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        isActive: true,
      },
      create: {
        userId: user.id,
        platform: data.platform,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        pageId: data.pageId ?? null,
        profileName: data.profileName ?? null,
        profilePicture: data.profilePicture ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
      },
    });

    revalidatePath("/dashboard/social");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar conexao" };
  }
}

export async function testSocialConnection(platform: string, accessToken: string, pageId?: string): Promise<ActionResult<{ name: string; picture?: string }>> {
  try {
    if (platform === "instagram" || platform === "facebook") {
      // Test Meta Graph API token
      const res = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=name,picture&access_token=${accessToken}`
      );
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message || "Token invalido" };
      }

      // If Instagram, check for IG business account on the page
      if (platform === "instagram" && pageId) {
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account{name,profile_picture_url}&access_token=${accessToken}`
        );
        const igData = await igRes.json();
        if (igData.error) {
          return { success: false, error: "Page ID invalido ou sem Instagram Business vinculado" };
        }
        const igAccount = igData.instagram_business_account;
        if (!igAccount) {
          return { success: false, error: "Nenhuma conta Instagram Business encontrada nesta Page" };
        }
        return {
          success: true,
          data: { name: igAccount.name || data.name, picture: igAccount.profile_picture_url },
        };
      }

      return {
        success: true,
        data: { name: data.name, picture: data.picture?.data?.url },
      };
    }

    if (platform === "google_business") {
      // Test Google Business Profile API
      const res = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message || "Token invalido" };
      }
      const account = data.accounts?.[0];
      return {
        success: true,
        data: { name: account?.accountName || "Google Business" },
      };
    }

    return { success: true, data: { name: platform } };
  } catch {
    return { success: false, error: "Erro ao testar conexao" };
  }
}

export async function disconnectPlatform(platform: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.socialConnection.updateMany({
      where: { userId: user.id, platform },
      data: { isActive: false },
    });

    revalidatePath("/dashboard/social");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao desconectar plataforma" };
  }
}

// ── Posts ─────────────────────────────────────────────────────

export async function getSocialPosts(filters?: {
  status?: string;
  mediaType?: string;
  platform?: string;
}): Promise<SocialPostData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const where: Record<string, unknown> = { userId: user.id };
  if (filters?.status) where.status = filters.status;
  if (filters?.mediaType) where.mediaType = filters.mediaType;
  if (filters?.platform) where.platforms = { has: filters.platform };

  const posts = await prisma.socialPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    caption: p.caption,
    hashtags: p.hashtags,
    mediaUrls: p.mediaUrls,
    mediaType: p.mediaType,
    platforms: p.platforms,
    scheduledAt: p.scheduledAt,
    publishedAt: p.publishedAt,
    status: p.status,
    aiGenerated: p.aiGenerated,
    aiCostEstimate: p.aiCostEstimate,
    publishResults: p.publishResults as Record<string, unknown> | null,
    engagementData: p.engagementData as Record<string, unknown> | null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function getScheduledPosts(month: number, year: number): Promise<SocialPostData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  const posts = await prisma.socialPost.findMany({
    where: {
      userId: user.id,
      scheduledAt: { gte: startDate, lte: endDate },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    caption: p.caption,
    hashtags: p.hashtags,
    mediaUrls: p.mediaUrls,
    mediaType: p.mediaType,
    platforms: p.platforms,
    scheduledAt: p.scheduledAt,
    publishedAt: p.publishedAt,
    status: p.status,
    aiGenerated: p.aiGenerated,
    aiCostEstimate: p.aiCostEstimate,
    publishResults: p.publishResults as Record<string, unknown> | null,
    engagementData: p.engagementData as Record<string, unknown> | null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function createSocialPost(data: {
  title?: string;
  caption?: string;
  hashtags?: string[];
  mediaUrls?: string[];
  mediaType?: string;
  platforms?: string[];
  scheduledAt?: string; // ISO string
  status?: string;
  aiGenerated?: boolean;
  aiCostEstimate?: number;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const post = await prisma.socialPost.create({
      data: {
        userId: user.id,
        title: data.title ?? null,
        caption: data.caption ?? null,
        hashtags: data.hashtags ?? [],
        mediaUrls: data.mediaUrls ?? [],
        mediaType: data.mediaType ?? null,
        platforms: data.platforms ?? [],
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.status ?? "draft",
        aiGenerated: data.aiGenerated ?? false,
        aiCostEstimate: data.aiCostEstimate ?? null,
      },
    });

    revalidatePath("/dashboard/social");
    return { success: true, data: { id: post.id } };
  } catch {
    return { success: false, error: "Erro ao criar post" };
  }
}

export async function updateSocialPost(
  id: string,
  data: {
    title?: string;
    caption?: string;
    hashtags?: string[];
    mediaUrls?: string[];
    mediaType?: string;
    platforms?: string[];
    scheduledAt?: string | null;
    status?: string;
  }
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.socialPost.updateMany({
      where: { id, userId: user.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
        ...(data.mediaUrls !== undefined && { mediaUrls: data.mediaUrls }),
        ...(data.mediaType !== undefined && { mediaType: data.mediaType }),
        ...(data.platforms !== undefined && { platforms: data.platforms }),
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    revalidatePath("/dashboard/social");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar post" };
  }
}

export async function deleteSocialPost(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await prisma.socialPost.deleteMany({
      where: { id, userId: user.id },
    });

    revalidatePath("/dashboard/social");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir post" };
  }
}

// ── Stats ────────────────────────────────────────────────────

export async function getSocialStats() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [totalPosts, publishedPosts, scheduledPosts, draftPosts, connections] =
    await Promise.all([
      prisma.socialPost.count({ where: { userId: user.id } }),
      prisma.socialPost.count({ where: { userId: user.id, status: "published" } }),
      prisma.socialPost.count({ where: { userId: user.id, status: "scheduled" } }),
      prisma.socialPost.count({ where: { userId: user.id, status: "draft" } }),
      prisma.socialConnection.count({ where: { userId: user.id, isActive: true } }),
    ]);

  return { totalPosts, publishedPosts, scheduledPosts, draftPosts, connections };
}

// ── Smart Scheduling ─────────────────────────────────────────

export async function getBestPostingTimes() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { suggestBestTimes } = await import("@/services/contentSuggestion");
  return suggestBestTimes(user.id);
}

// ── Manual trigger: generate weekly suggestions ──────────────

export async function triggerWeeklySuggestions(): Promise<ActionResult<{ generated: number }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const { generateWeeklyContentSuggestions } = await import("@/services/contentSuggestion");
  const result = await generateWeeklyContentSuggestions(user.id);

  revalidatePath("/dashboard/social");
  return { success: true, data: { generated: result.generated } };
}
