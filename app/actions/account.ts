"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

export async function getAccountData() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const dbUser = await getCurrentUser();

  return {
    email: authUser.email ?? "",
    name: dbUser?.name ?? "",
    photoUrl: dbUser?.photoUrl ?? null,
    createdAt: dbUser?.createdAt ?? new Date(),
    provider: authUser.app_metadata?.provider ?? "email",
  };
}

export async function updateAccountName(name: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar nome" };
  }
}

export async function updateAccountEmail(newEmail: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) return { success: false, error: error.message };

    // Also update in our database
    const user = await getCurrentUser();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar email" };
  }
}

export async function updateAccountPhoto(photoUrl: string | null): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar foto" };
  }
}

export async function updateAccountPassword(newPassword: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao atualizar senha" };
  }
}

export async function deleteAccount(): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    // Delete user data from database (cascade will handle related records)
    await prisma.user.delete({ where: { id: user.id } });

    // Sign out from Supabase
    const supabase = await createClient();
    await supabase.auth.signOut();

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao excluir conta" };
  }
}
