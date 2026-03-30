import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type PublishResult = {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
};

// ── Instagram Publisher (via Meta Graph API) ─────────────────

async function publishToInstagram(
  accessToken: string,
  pageId: string,
  post: { caption: string; mediaUrls: string[]; mediaType: string }
): Promise<PublishResult> {
  const igAccountId = await getInstagramAccountId(accessToken, pageId);
  if (!igAccountId) {
    return { platform: "instagram", success: false, error: "Instagram account nao encontrado na Page" };
  }

  try {
    if (post.mediaType === "carousel" && post.mediaUrls.length > 1) {
      // Carousel: create containers for each image, then create carousel
      const containerIds: string[] = [];
      for (const url of post.mediaUrls) {
        const res = await metaGraphPost(`${igAccountId}/media`, accessToken, {
          image_url: url,
          is_carousel_item: true,
        });
        if (res.id) containerIds.push(res.id);
      }

      const carousel = await metaGraphPost(`${igAccountId}/media`, accessToken, {
        media_type: "CAROUSEL",
        children: containerIds.join(","),
        caption: post.caption,
      });

      const published = await metaGraphPost(`${igAccountId}/media_publish`, accessToken, {
        creation_id: carousel.id,
      });

      return { platform: "instagram", success: true, postId: published.id };
    }

    if (post.mediaType === "reels" || post.mediaType === "video") {
      // Reels/Video
      const container = await metaGraphPost(`${igAccountId}/media`, accessToken, {
        video_url: post.mediaUrls[0],
        caption: post.caption,
        media_type: "REELS",
        share_to_feed: true,
      });

      // Poll for container status (video processing)
      let status = "IN_PROGRESS";
      let attempts = 0;
      while (status === "IN_PROGRESS" && attempts < 30) {
        await new Promise((r) => setTimeout(r, 3000));
        const check = await metaGraphGet(`${container.id}?fields=status_code`, accessToken);
        status = check.status_code || "FINISHED";
        attempts++;
      }

      const published = await metaGraphPost(`${igAccountId}/media_publish`, accessToken, {
        creation_id: container.id,
      });

      return { platform: "instagram", success: true, postId: published.id };
    }

    // Single image post
    const container = await metaGraphPost(`${igAccountId}/media`, accessToken, {
      image_url: post.mediaUrls[0],
      caption: post.caption,
    });

    const published = await metaGraphPost(`${igAccountId}/media_publish`, accessToken, {
      creation_id: container.id,
    });

    return { platform: "instagram", success: true, postId: published.id };
  } catch (error) {
    return {
      platform: "instagram",
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ── Facebook Publisher (via Meta Graph API) ──────────────────

async function publishToFacebook(
  accessToken: string,
  pageId: string,
  post: { caption: string; mediaUrls: string[]; mediaType: string }
): Promise<PublishResult> {
  try {
    if (
      post.mediaType === "video" ||
      post.mediaType === "reels"
    ) {
      const res = await metaGraphPost(`${pageId}/videos`, accessToken, {
        file_url: post.mediaUrls[0],
        description: post.caption,
      });
      return { platform: "facebook", success: true, postId: res.id };
    }

    if (post.mediaUrls.length > 1) {
      // Multiple photos
      const photoIds: string[] = [];
      for (const url of post.mediaUrls) {
        const res = await metaGraphPost(`${pageId}/photos`, accessToken, {
          url,
          published: false,
        });
        if (res.id) photoIds.push(res.id);
      }

      const res = await metaGraphPost(`${pageId}/feed`, accessToken, {
        message: post.caption,
        ...Object.fromEntries(
          photoIds.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })])
        ),
      });
      return { platform: "facebook", success: true, postId: res.id };
    }

    if (post.mediaUrls.length === 1) {
      const res = await metaGraphPost(`${pageId}/photos`, accessToken, {
        url: post.mediaUrls[0],
        message: post.caption,
      });
      return { platform: "facebook", success: true, postId: res.id };
    }

    // Text-only post
    const res = await metaGraphPost(`${pageId}/feed`, accessToken, {
      message: post.caption,
    });
    return { platform: "facebook", success: true, postId: res.id };
  } catch (error) {
    return {
      platform: "facebook",
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ── Google Business Publisher ─────────────────────────────────

async function publishToGoogleBusiness(
  accessToken: string,
  _pageId: string,
  post: { caption: string; mediaUrls: string[] }
): Promise<PublishResult> {
  try {
    // Google Business Profile API v1
    // pageId here is the location resource name (e.g., "locations/123456")
    const body: Record<string, unknown> = {
      languageCode: "pt-BR",
      topicType: "STANDARD",
      summary: post.caption,
    };

    if (post.mediaUrls.length > 0) {
      body.media = [
        {
          mediaFormat: "PHOTO",
          sourceUrl: post.mediaUrls[0],
        },
      ];
    }

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${_pageId}/localPosts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        platform: "google_business",
        success: false,
        error: err?.error?.message || `Google retornou ${res.status}`,
      };
    }

    const data = await res.json();
    return { platform: "google_business", success: true, postId: data.name };
  } catch (error) {
    return {
      platform: "google_business",
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

// ── Main Publish Orchestrator ────────────────────────────────

export async function publishScheduledPosts() {
  const now = new Date();

  // Find all posts that are scheduled and past due
  const posts = await prisma.socialPost.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    take: 10, // Process up to 10 posts per cron run
  });

  const results: { postId: string; results: PublishResult[] }[] = [];

  for (const post of posts) {
    // Mark as publishing
    await prisma.socialPost.update({
      where: { id: post.id },
      data: { status: "publishing" },
    });

    const caption = buildCaption(post.caption, post.hashtags);
    const publishResults: PublishResult[] = [];

    // Get user's social connections
    const connections = await prisma.socialConnection.findMany({
      where: {
        userId: post.userId,
        isActive: true,
        platform: { in: post.platforms },
      },
    });

    for (const conn of connections) {
      let result: PublishResult;

      switch (conn.platform) {
        case "instagram":
          result = await publishToInstagram(conn.accessToken, conn.pageId || "", {
            caption,
            mediaUrls: post.mediaUrls,
            mediaType: post.mediaType || "image",
          });
          break;

        case "facebook":
          result = await publishToFacebook(conn.accessToken, conn.pageId || "", {
            caption,
            mediaUrls: post.mediaUrls,
            mediaType: post.mediaType || "image",
          });
          break;

        case "google_business":
          result = await publishToGoogleBusiness(conn.accessToken, conn.pageId || "", {
            caption,
            mediaUrls: post.mediaUrls,
          });
          break;

        default:
          result = {
            platform: conn.platform,
            success: false,
            error: `Publisher para ${conn.platform} nao implementado ainda`,
          };
      }

      publishResults.push(result);
    }

    // Also handle platforms without connections
    for (const platform of post.platforms) {
      if (!connections.some((c) => c.platform === platform)) {
        publishResults.push({
          platform,
          success: false,
          error: "Plataforma nao conectada",
        });
      }
    }

    const allSuccess = publishResults.length > 0 && publishResults.every((r) => r.success);
    const anySuccess = publishResults.some((r) => r.success);

    await prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: allSuccess ? "published" : anySuccess ? "published" : "failed",
        publishedAt: anySuccess ? now : null,
        publishResults: JSON.parse(JSON.stringify(publishResults)),
      },
    });

    results.push({ postId: post.id, results: publishResults });
  }

  return { processed: posts.length, results };
}

// ── Metrics Collector ────────────────────────────────────────

export async function collectPostMetrics() {
  // Find published posts from last 7 days that have Instagram/Facebook connections
  const recentPosts = await prisma.socialPost.findMany({
    where: {
      status: "published",
      publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      publishResults: { not: Prisma.JsonNull },
    },
    take: 50,
  });

  let updated = 0;

  for (const post of recentPosts) {
    const results = post.publishResults as PublishResult[] | null;
    if (!results) continue;

    const connections = await prisma.socialConnection.findMany({
      where: { userId: post.userId, isActive: true },
    });

    const engagement: Record<string, unknown> = {};

    for (const result of results) {
      if (!result.success || !result.postId) continue;

      const conn = connections.find((c) => c.platform === result.platform);
      if (!conn) continue;

      try {
        if (result.platform === "instagram" || result.platform === "facebook") {
          const metrics = await metaGraphGet(
            `${result.postId}?fields=like_count,comments_count,shares,impressions_count`,
            conn.accessToken
          );

          engagement[result.platform] = {
            likes: metrics.like_count || 0,
            comments: metrics.comments_count || 0,
            shares: metrics.shares?.count || 0,
            impressions: metrics.impressions_count || 0,
          };
        }
      } catch {
        // Non-critical — metrics will be collected next cycle
      }
    }

    if (Object.keys(engagement).length > 0) {
      const existingData = (post.engagementData as Record<string, unknown>) || {};
      await prisma.socialPost.update({
        where: { id: post.id },
        data: {
          engagementData: JSON.parse(JSON.stringify({ ...existingData, ...engagement })),
        },
      });
      updated++;
    }
  }

  return { checked: recentPosts.length, updated };
}

// ── Helpers ──────────────────────────────────────────────────

function buildCaption(caption: string | null, hashtags: string[]): string {
  let text = caption || "";
  if (hashtags.length > 0) {
    text += "\n\n" + hashtags.map((h) => `#${h}`).join(" ");
  }
  return text;
}

async function getInstagramAccountId(
  accessToken: string,
  pageId: string
): Promise<string | null> {
  try {
    const data = await metaGraphGet(
      `${pageId}?fields=instagram_business_account`,
      accessToken
    );
    return data.instagram_business_account?.id || null;
  } catch {
    return null;
  }
}

async function metaGraphPost(
  endpoint: string,
  accessToken: string,
  params: Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const url = `https://graph.facebook.com/v18.0/${endpoint}`;
  const body = new URLSearchParams();
  body.append("access_token", accessToken);
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      body.append(key, String(val));
    }
  }

  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || `Meta API error: ${JSON.stringify(data.error)}`);
  }

  return data;
}

async function metaGraphGet(
  endpoint: string,
  accessToken: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const url = `https://graph.facebook.com/v18.0/${endpoint}${endpoint.includes("?") ? "&" : "?"}access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || `Meta API error: ${JSON.stringify(data.error)}`);
  }

  return data;
}
