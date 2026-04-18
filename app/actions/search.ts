"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export type SearchResult = {
  id: string;
  type: "lead" | "message" | "post" | "template";
  title: string;
  subtitle: string;
  url: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const user = await getCurrentUser();
  if (!user || !query || query.length < 2) return [];

  const q = query.trim();
  const results: SearchResult[] = [];

  const [leads, posts, templates] = await Promise.all([
    prisma.lead.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, phone: true, scoreLabel: true },
      take: 5,
    }),
    prisma.socialPost.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { caption: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, status: true, mediaType: true },
      take: 3,
    }),
    prisma.messageTemplate.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, category: true },
      take: 3,
    }),
  ]);

  for (const lead of leads) {
    results.push({
      id: lead.id,
      type: "lead",
      title: lead.name,
      subtitle: `${lead.phone} · ${lead.scoreLabel || "sem score"}`,
      url: "/dashboard/pipeline",
    });
  }

  for (const post of posts) {
    results.push({
      id: post.id,
      type: "post",
      title: post.title || "Post sem titulo",
      subtitle: `${post.mediaType || "post"} · ${post.status}`,
      url: "/dashboard/posts",
    });
  }

  for (const tpl of templates) {
    results.push({
      id: tpl.id,
      type: "template",
      title: tpl.name,
      subtitle: tpl.category,
      url: "/dashboard/chat/templates",
    });
  }

  return results;
}
