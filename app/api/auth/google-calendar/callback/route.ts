import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/services/googleCalendar";

/**
 * GET /api/auth/google-calendar/callback — OAuth callback
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(new URL("/dashboard/settings/services?error=missing_params", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await getGoogleUserEmail(tokens.access_token);

    await prisma.googleCalendar.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        email: email || undefined,
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        email,
      },
    });

    return NextResponse.redirect(new URL("/dashboard/settings/services?calendar=connected", req.url));
  } catch (err) {
    console.error("[Google Calendar] OAuth error:", err);
    return NextResponse.redirect(new URL("/dashboard/settings/services?error=oauth_failed", req.url));
  }
}
