import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_STAGES = [
  { name: "Novo Lead", order: 1, eventName: "Lead" },
  { name: "Atendido", order: 2, eventName: "Contact" },
  { name: "Qualificado", order: 3, eventName: "QualifiedLead" },
  { name: "Agendado", order: 4, eventName: "Schedule" },
  { name: "Cliente", order: 5, eventName: "Purchase" },
];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { stages: true },
  });

  if (!existingUser) {
    const newUser = await prisma.user.create({
      data: {
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        facebookId: user.user_metadata?.provider_id ?? null,
      },
    });

    await prisma.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, userId: newUser.id })),
    });
  } else if (existingUser.stages.length === 0) {
    await prisma.stage.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, userId: existingUser.id })),
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}
