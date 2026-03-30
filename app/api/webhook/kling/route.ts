import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

/**
 * Kling AI Webhook — callback when video clip generation completes.
 *
 * Kling sends POST with:
 * {
 *   "task_id": "xxx",
 *   "task_status": "succeed" | "failed",
 *   "task_result": { "videos": [{ "url": "https://...", "duration": 5 }] }
 * }
 */

type KlingWebhookPayload = {
  task_id?: string;
  task_status?: string;
  task_status_msg?: string;
  task_result?: {
    videos?: { url: string; duration?: number }[];
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as KlingWebhookPayload;

    const taskId = body.task_id;
    if (!taskId) return NextResponse.json({ ok: true });

    // Find the clip by external task ID
    const clip = await prisma.videoClip.findFirst({
      where: { externalTaskId: taskId },
      include: { story: { select: { userId: true } } },
    });

    if (!clip) {
      console.error(`[kling webhook] Clip not found for task: ${taskId}`);
      return NextResponse.json({ ok: true });
    }

    if (body.task_status === "succeed") {
      const videoUrl = body.task_result?.videos?.[0]?.url;
      if (!videoUrl) {
        await prisma.videoClip.update({
          where: { id: clip.id },
          data: { clipStatus: "error" },
        });
        return NextResponse.json({ ok: true });
      }

      // Download and store in Vercel Blob
      try {
        const videoRes = await fetch(videoUrl);
        const blob = await videoRes.blob();
        const stored = await put(
          `stories/${clip.story.userId}/${clip.storyId}/clip-${clip.order}-${Date.now()}.mp4`,
          blob,
          { access: "public" }
        );

        await prisma.videoClip.update({
          where: { id: clip.id },
          data: { clipStatus: "done", videoUrl: stored.url },
        });

        // Log cost
        await prisma.aiUsageLog.create({
          data: {
            userId: clip.story.userId,
            operation: "story_video_clip",
            provider: "kling",
            model: clip.model || "kling-v2",
            costUsd: clip.mode === "pro" ? 0.5 : 0.3,
          },
        });

        // Check if all clips for this story are done
        const pendingClips = await prisma.videoClip.count({
          where: { storyId: clip.storyId, clipStatus: { not: "done" } },
        });
        if (pendingClips === 0) {
          await prisma.story.update({
            where: { id: clip.storyId },
            data: { status: "video_review" },
          });
        }
      } catch (err) {
        console.error(`[kling webhook] Failed to store video:`, err);
        await prisma.videoClip.update({
          where: { id: clip.id },
          data: { clipStatus: "error" },
        });
      }
    } else if (body.task_status === "failed") {
      await prisma.videoClip.update({
        where: { id: clip.id },
        data: { clipStatus: "error" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[kling webhook] Error:", err);
    return NextResponse.json({ ok: true });
  }
}
