import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getGoogleAuthUrl } from "@/services/googleCalendar";

/**
 * GET /api/auth/google-calendar — Initiate OAuth flow
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const authUrl = getGoogleAuthUrl(dbUser.id);
  return NextResponse.redirect(authUrl);
}
