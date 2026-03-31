"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import {
  chatForScript,
  generateScript,
  generateCharacterImage,
  generateFrameImage,
  startVideoClipGeneration,
  checkVideoClipStatus,
  generateCaptions,
} from "@/services/storyboardAI";
import type { ActionResult } from "@/types";

async function getConfig(userId: string) {
  const config = await prisma.aIConfig.findUnique({ where: { userId } });
  if (!config?.apiKey) throw new Error("Chave OpenAI nao configurada. Va em Configuracoes.");
  const brand = (config.brandIdentity as Record<string, string>) || {};
  return { ...config, brandIdentity: brand };
}

async function verifyStoryOwnership(storyId: string, userId: string) {
  const story = await prisma.story.findFirst({ where: { id: storyId, userId } });
  if (!story) throw new Error("Story nao encontrada");
  return story;
}

// ══════════════════════════════════════════════════════════════
// STAGE 1: SCRIPT
// ══════════════════════════════════════════════════════════════

export async function sendChatMessage(
  storyId: string,
  message: string
): Promise<ActionResult<{ reply: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };
  if (!message?.trim()) return { success: false, error: "Mensagem obrigatoria" };

  try {
    const story = await verifyStoryOwnership(storyId, user.id);
    const config = await getConfig(user.id);

    // Save user message
    await prisma.storyChatMessage.create({
      data: { storyId, role: "user", content: message.trim() },
    });

    // Get chat history
    const messages = await prisma.storyChatMessage.findMany({
      where: { storyId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    const reply = await chatForScript({
      message: message.trim(),
      history,
      videoType: story.videoType,
      duration: story.targetDuration,
      tone: story.tone || "profissional",
      niche: story.niche,
      config,
      userId: user.id,
    });

    // Save assistant reply
    await prisma.storyChatMessage.create({
      data: { storyId, role: "assistant", content: reply },
    });

    await prisma.story.update({
      where: { id: storyId },
      data: { status: "scripting", currentStage: "script" },
    });

    revalidatePath("/dashboard/studio");
    return { success: true, data: { reply } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro no chat" };
  }
}

export async function generateStoryScript(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const story = await verifyStoryOwnership(storyId, user.id);
    const config = await getConfig(user.id);

    const messages = await prisma.storyChatMessage.findMany({
      where: { storyId },
      orderBy: { createdAt: "asc" },
    });

    const script = await generateScript({
      topic: story.title,
      videoType: story.videoType,
      duration: story.targetDuration,
      tone: story.tone || "profissional",
      targetAudience: story.targetAudience || "",
      niche: story.niche,
      chatHistory: messages.map((m) => ({ role: m.role, content: m.content })),
      userId: user.id,
      config,
    });

    // Save script + create characters + frames
    await prisma.$transaction(async (tx) => {
      await tx.story.update({
        where: { id: storyId },
        data: {
          status: "script_review",
          scriptRaw: JSON.stringify(script),
          scriptJson: JSON.parse(JSON.stringify(script)),
          caption: script.caption,
          hashtags: script.hashtags,
        },
      });

      // Create characters from script
      for (const char of script.characters) {
        await tx.storyCharacter.create({
          data: {
            storyId,
            name: char.name,
            description: char.description,
            role: char.role,
          },
        });
      }

      // Create frames from scenes
      for (let i = 0; i < script.scenes.length; i++) {
        const scene = script.scenes[i];
        await tx.storyboardFrame.create({
          data: {
            storyId,
            order: i,
            sceneTitle: scene.sceneTitle,
            narration: scene.narration,
            visualDescription: scene.visualDescription,
            duration: scene.duration,
            cameraDirection: scene.cameraDirection,
            transition: scene.transition,
            textOverlay: scene.textOverlay,
          },
        });
      }
    });

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao gerar roteiro" };
  }
}

export async function approveScript(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.story.updateMany({
    where: { id: storyId, userId: user.id },
    data: { status: "characters", currentStage: "characters" },
  });

  revalidatePath("/dashboard/studio");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// STAGE 2: CHARACTERS
// ══════════════════════════════════════════════════════════════

export async function generateCharacters(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const story = await verifyStoryOwnership(storyId, user.id);
    const config = await getConfig(user.id);

    const characters = await prisma.storyCharacter.findMany({
      where: { storyId, imageStatus: "pending" },
    });

    for (const char of characters) {
      await prisma.storyCharacter.update({
        where: { id: char.id },
        data: { imageStatus: "generating" },
      });

      try {
        const imageUrl = await generateCharacterImage({
          description: char.description,
          niche: story.niche,
          userId: user.id,
          storyId,
          config,
        });

        await prisma.storyCharacter.update({
          where: { id: char.id },
          data: { imageUrl, imageStatus: "done" },
        });
      } catch {
        await prisma.storyCharacter.update({
          where: { id: char.id },
          data: { imageStatus: "error" },
        });
      }
    }

    await prisma.story.update({
      where: { id: storyId },
      data: { status: "char_review" },
    });

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao gerar personagens" };
  }
}

export async function regenerateCharacter(characterId: string, customPrompt?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const char = await prisma.storyCharacter.findUnique({
      where: { id: characterId },
      include: { story: true },
    });
    if (!char || char.story.userId !== user.id) return { success: false, error: "Nao encontrado" };

    const config = await getConfig(user.id);

    await prisma.storyCharacter.update({
      where: { id: characterId },
      data: { imageStatus: "generating", ...(customPrompt && { description: customPrompt }) },
    });

    const imageUrl = await generateCharacterImage({
      description: customPrompt || char.description,
      niche: char.story.niche,
      userId: user.id,
      storyId: char.storyId,
      config,
    });

    await prisma.storyCharacter.update({
      where: { id: characterId },
      data: { imageUrl, imageStatus: "done", isApproved: false },
    });

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao regenerar" };
  }
}

export async function approveAllCharacters(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.storyCharacter.updateMany({
    where: { storyId, story: { userId: user.id } },
    data: { isApproved: true },
  });

  await prisma.story.updateMany({
    where: { id: storyId, userId: user.id },
    data: { status: "storyboarding", currentStage: "storyboard" },
  });

  revalidatePath("/dashboard/studio");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// STAGE 3: STORYBOARD
// ══════════════════════════════════════════════════════════════

export async function generateStoryboardFrames(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const story = await verifyStoryOwnership(storyId, user.id);
    const config = await getConfig(user.id);

    const frames = await prisma.storyboardFrame.findMany({
      where: { storyId, imageStatus: "pending" },
      orderBy: { order: "asc" },
    });

    for (const frame of frames) {
      await prisma.storyboardFrame.update({
        where: { id: frame.id },
        data: { imageStatus: "generating" },
      });

      try {
        const imageUrl = await generateFrameImage({
          visualDescription: frame.visualDescription,
          cameraDirection: frame.cameraDirection || "medium shot",
          niche: story.niche,
          userId: user.id,
          storyId,
          config,
        });

        await prisma.storyboardFrame.update({
          where: { id: frame.id },
          data: { imageUrl, imageStatus: "done" },
        });
      } catch {
        await prisma.storyboardFrame.update({
          where: { id: frame.id },
          data: { imageStatus: "error" },
        });
      }
    }

    await prisma.story.update({
      where: { id: storyId },
      data: { status: "storyboard_review" },
    });

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao gerar frames" };
  }
}

export async function regenerateFrame(frameId: string, customPrompt?: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const frame = await prisma.storyboardFrame.findUnique({
      where: { id: frameId },
      include: { story: true },
    });
    if (!frame || frame.story.userId !== user.id) return { success: false, error: "Nao encontrado" };

    const config = await getConfig(user.id);

    await prisma.storyboardFrame.update({
      where: { id: frameId },
      data: { imageStatus: "generating", ...(customPrompt && { visualDescription: customPrompt }) },
    });

    const imageUrl = await generateFrameImage({
      visualDescription: customPrompt || frame.visualDescription,
      cameraDirection: frame.cameraDirection || "medium shot",
      niche: frame.story.niche,
      userId: user.id,
      storyId: frame.storyId,
      config,
    });

    await prisma.storyboardFrame.update({
      where: { id: frameId },
      data: { imageUrl, imageStatus: "done", isApproved: false },
    });

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao regenerar frame" };
  }
}

export async function reorderFrames(storyId: string, frameIds: string[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await verifyStoryOwnership(storyId, user.id);

  for (let i = 0; i < frameIds.length; i++) {
    await prisma.storyboardFrame.updateMany({
      where: { id: frameIds[i], storyId },
      data: { order: i },
    });
  }

  revalidatePath("/dashboard/studio");
  return { success: true };
}

export async function approveAllFrames(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.storyboardFrame.updateMany({
    where: { storyId, story: { userId: user.id } },
    data: { isApproved: true },
  });

  await prisma.story.updateMany({
    where: { id: storyId, userId: user.id },
    data: { status: "video_generating", currentStage: "video" },
  });

  revalidatePath("/dashboard/studio");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// STAGE 4: VIDEO CLIPS
// ══════════════════════════════════════════════════════════════

export async function generateVideoClips(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    await verifyStoryOwnership(storyId, user.id);
    const config = await getConfig(user.id);

    const frames = await prisma.storyboardFrame.findMany({
      where: { storyId, imageStatus: "done" },
      orderBy: { order: "asc" },
    });

    if (frames.length < 2) return { success: false, error: "Precisa de pelo menos 2 frames com imagem" };

    // Create clips for consecutive frame pairs
    for (let i = 0; i < frames.length - 1; i++) {
      const startFrame = frames[i];
      const endFrame = frames[i + 1];

      if (!startFrame.imageUrl || !endFrame.imageUrl) continue;

      const clip = await prisma.videoClip.create({
        data: {
          storyId,
          order: i,
          startFrameId: startFrame.id,
          endFrameId: endFrame.id,
          clipStatus: "generating",
          duration: startFrame.duration || 5,
        },
      });

      try {
        const { taskId, provider } = await startVideoClipGeneration({
          startFrameUrl: startFrame.imageUrl,
          endFrameUrl: endFrame.imageUrl,
          duration: (startFrame.duration || 5) as 5 | 10,
          userId: user.id,
          storyId,
          config,
        });

        await prisma.videoClip.update({
          where: { id: clip.id },
          data: { externalTaskId: taskId, provider },
        });
      } catch {
        await prisma.videoClip.update({
          where: { id: clip.id },
          data: { clipStatus: "error" },
        });
      }
    }

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao gerar clips" };
  }
}

export async function checkClipStatus(clipId: string): Promise<ActionResult<{ status: string; url?: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const clip = await prisma.videoClip.findUnique({
    where: { id: clipId },
    include: { story: true },
  });
  if (!clip || clip.story.userId !== user.id) return { success: false, error: "Nao encontrado" };
  if (!clip.externalTaskId || !clip.provider) return { success: true, data: { status: clip.clipStatus } };

  const config = await getConfig(user.id);

  const result = await checkVideoClipStatus({
    taskId: clip.externalTaskId,
    provider: clip.provider,
    userId: user.id,
    storyId: clip.storyId,
    config,
  });

  if (result.status === "done" && result.url) {
    await prisma.videoClip.update({
      where: { id: clipId },
      data: { clipStatus: "done", videoUrl: result.url },
    });
  } else if (result.status === "error") {
    await prisma.videoClip.update({
      where: { id: clipId },
      data: { clipStatus: "error" },
    });
  }

  revalidatePath("/dashboard/studio");
  return { success: true, data: result };
}

export async function checkAllClipsStatus(storyId: string): Promise<ActionResult<{
  total: number; done: number; generating: number; error: number;
}>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const clips = await prisma.videoClip.findMany({
    where: { storyId, story: { userId: user.id } },
  });

  let done = 0, generating = 0, errorCount = 0;

  for (const clip of clips) {
    if (clip.clipStatus === "done") { done++; continue; }
    if (clip.clipStatus === "error") { errorCount++; continue; }
    if (clip.clipStatus === "generating" && clip.externalTaskId && clip.provider) {
      const config = await getConfig(user.id);
      const result = await checkVideoClipStatus({
        taskId: clip.externalTaskId,
        provider: clip.provider,
        userId: user.id,
        storyId,
        config,
      });

      if (result.status === "done" && result.url) {
        await prisma.videoClip.update({ where: { id: clip.id }, data: { clipStatus: "done", videoUrl: result.url } });
        done++;
      } else if (result.status === "error") {
        await prisma.videoClip.update({ where: { id: clip.id }, data: { clipStatus: "error" } });
        errorCount++;
      } else {
        generating++;
      }
    } else {
      generating++;
    }
  }

  // If all done, advance to video_review
  if (done === clips.length && clips.length > 0) {
    await prisma.story.updateMany({
      where: { id: storyId, userId: user.id },
      data: { status: "video_review" },
    });
  }

  revalidatePath("/dashboard/studio");
  return { success: true, data: { total: clips.length, done, generating, error: errorCount } };
}

export async function approveAllClips(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  await prisma.videoClip.updateMany({
    where: { storyId, story: { userId: user.id } },
    data: { isApproved: true },
  });

  // Mark as completed (concat is optional in serverless)
  await prisma.story.updateMany({
    where: { id: storyId, userId: user.id },
    data: { status: "completed", currentStage: "publish" },
  });

  revalidatePath("/dashboard/studio");
  return { success: true };
}

// ══════════════════════════════════════════════════════════════
// STAGE 5: PUBLISH
// ══════════════════════════════════════════════════════════════

export async function generateStoryCaptions(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  try {
    const story = await verifyStoryOwnership(storyId, user.id);
    if (!story.scriptJson) return { success: false, error: "Roteiro nao gerado" };

    const config = await getConfig(user.id);
    const platforms = story.platforms.length > 0 ? story.platforms : ["instagram"];

    const captions = await generateCaptions({
      script: story.scriptJson as Record<string, unknown> as Parameters<typeof generateCaptions>[0]["script"],
      platforms,
      niche: story.niche,
      userId: user.id,
      config,
    });

    if (captions.length > 0) {
      await prisma.story.update({
        where: { id: storyId },
        data: {
          caption: captions[0].caption,
          hashtags: captions[0].hashtags,
        },
      });
    }

    revalidatePath("/dashboard/studio");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro ao gerar captions" };
  }
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════

export async function getPipelineStatus(storyId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const story = await prisma.story.findFirst({
    where: { id: storyId, userId: user.id },
    include: {
      _count: { select: { chatMessages: true, characters: true, frames: true, videoClips: true } },
      characters: { select: { imageStatus: true, isApproved: true } },
      frames: { select: { imageStatus: true, isApproved: true } },
      videoClips: { select: { clipStatus: true, isApproved: true } },
    },
  });

  if (!story) return null;

  return {
    status: story.status,
    currentStage: story.currentStage,
    script: { hasChat: story._count.chatMessages > 0, hasScript: !!story.scriptJson },
    characters: {
      total: story._count.characters,
      done: story.characters.filter((c) => c.imageStatus === "done").length,
      approved: story.characters.filter((c) => c.isApproved).length,
    },
    storyboard: {
      total: story._count.frames,
      done: story.frames.filter((f) => f.imageStatus === "done").length,
      approved: story.frames.filter((f) => f.isApproved).length,
    },
    video: {
      total: story._count.videoClips,
      done: story.videoClips.filter((v) => v.clipStatus === "done").length,
      approved: story.videoClips.filter((v) => v.isApproved).length,
    },
    hasCaption: !!story.caption,
    hasFinalVideo: !!story.finalVideoUrl,
  };
}

export async function retryFailedStage(storyId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Nao autenticado" };

  const story = await prisma.story.findFirst({ where: { id: storyId, userId: user.id } });
  if (!story || story.status !== "failed") return { success: false, error: "Story nao esta em estado de erro" };

  // Reset failed items based on current stage
  if (story.currentStage === "characters") {
    await prisma.storyCharacter.updateMany({
      where: { storyId, imageStatus: "error" },
      data: { imageStatus: "pending" },
    });
  } else if (story.currentStage === "storyboard") {
    await prisma.storyboardFrame.updateMany({
      where: { storyId, imageStatus: "error" },
      data: { imageStatus: "pending" },
    });
  } else if (story.currentStage === "video") {
    await prisma.videoClip.updateMany({
      where: { storyId, clipStatus: "error" },
      data: { clipStatus: "pending" },
    });
  }

  await prisma.story.update({
    where: { id: storyId },
    data: { status: story.currentStage === "characters" ? "characters" : story.currentStage === "storyboard" ? "storyboarding" : "video_generating" },
  });

  revalidatePath("/dashboard/studio");
  return { success: true };
}
