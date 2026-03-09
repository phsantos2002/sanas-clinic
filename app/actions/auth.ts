"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const DEFAULT_STAGES = [
  { name: "Novo Lead", order: 1, eventName: "Lead" },
  { name: "Atendido", order: 2, eventName: "Contact" },
  { name: "Qualificado", order: 3, eventName: "QualifiedLead" },
  { name: "Agendado", order: 4, eventName: "Schedule" },
  { name: "Cliente", order: 5, eventName: "Purchase" },
];

async function ensureUserInDB(email: string, name?: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { stages: true },
  });

  if (!existing) {
    const newUser = await prisma.user.create({
      data: { email, name: name ?? null },
    });
    await prisma.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, userId: newUser.id })),
    });
  } else if (existing.stages.length === 0) {
    await prisma.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, userId: existing.id })),
    });
  }
}

export async function signInWithFacebook() {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: { redirectTo: `${appUrl}/auth/callback` },
  });

  if (error || !data.url) return redirect("/login?error=oauth_failed");
  return redirect(data.url);
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return redirect("/login?error=invalid_credentials");

  await ensureUserInDB(email);
  redirect("/dashboard");
}

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return redirect("/login?error=signup_failed");

  await ensureUserInDB(email);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
