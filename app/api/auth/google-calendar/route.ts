import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  : "https://sanas-clinic-l235.vercel.app/api/auth/google-calendar/callback";

/**
 * GET /api/auth/google-calendar — Initiate OAuth flow
 */
export async function GET() {
  // Check if Google is configured
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json({
      error: "Google Calendar nao configurado",
      detail: "Env vars GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nao definidas no Vercel",
    }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.redirect(new URL("/login", REDIRECT_URI.replace("/api/auth/google-calendar/callback", "")));
  }

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found in database" }, { status: 404 });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: dbUser.id,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
