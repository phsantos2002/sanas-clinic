import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/services/googleCalendar";
import { encrypt } from "@/lib/crypto";

/**
 * GET /api/auth/google-calendar/callback — OAuth callback
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const userId = req.nextUrl.searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/business?error=missing_params", req.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const email = await getGoogleUserEmail(tokens.access_token);

    // Encrypt tokens at rest (Sub-fase A). Reads must use decrypt() — see
    // services/googleCalendar.ts and the future MCP server tool handlers.
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

    await prisma.googleCalendar.upsert({
      where: { userId },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh ?? undefined,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        email: email || undefined,
      },
      create: {
        userId,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh ?? "",
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        email,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard/settings/business?calendar=connected", req.url)
    );
  } catch (err) {
    console.error("[Google Calendar] OAuth error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings/business?error=oauth_failed", req.url)
    );
  }
}
