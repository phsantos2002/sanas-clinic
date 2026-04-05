"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

const TUTORIAL_KEY = "tutorial_intro";

export async function hasTutorialBeenSeen(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return true; // don't show if not logged in
  return (user.checklistCompleted || []).includes(TUTORIAL_KEY);
}

export async function markTutorialSeen() {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  const current = user.checklistCompleted || [];
  if (!current.includes(TUTORIAL_KEY)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { checklistCompleted: [...current, TUTORIAL_KEY] },
    });
  }

  return { success: true };
}
