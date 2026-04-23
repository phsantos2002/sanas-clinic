import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUazapiStatus, connectUazapiInstance } from "@/services/whatsappUazapi";

/**
 * GET /api/whatsapp/health — normalized status of the user's Uazapi instance.
 * POST /api/whatsapp/health?action=reconnect — attempt to reconnect.
 */

async function loadUazapiConfig() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return null;

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (
    !config ||
    config.provider !== "uazapi" ||
    !config.uazapiServerUrl ||
    !config.uazapiInstanceToken
  ) {
    return null;
  }
  return {
    serverUrl: config.uazapiServerUrl.trim().replace(/\/+$/, ""),
    token: config.uazapiInstanceToken.trim(),
  };
}

// Track per-instance auto-reconnect attempts to avoid hammering Uazapi
const autoReconnectCooldown = new Map<string, number>();
const AUTO_RECONNECT_COOLDOWN_MS = 60_000; // 1 minute between attempts

export async function GET(req: Request) {
  const config = await loadUazapiConfig();
  if (!config) {
    return NextResponse.json(
      { state: "not_configured", connected: false, message: "Uazapi nao configurado" },
      { status: 200 }
    );
  }

  const result = await getUazapiStatus(config.serverUrl, config.token);
  const rawStatus = (result.status || "").toLowerCase();
  let state: "connected" | "connecting" | "disconnected" | "error" = "error";
  if (result.connected) state = "connected";
  else if (rawStatus === "connecting" || rawStatus === "qr") state = "connecting";
  else if (rawStatus === "disconnected" || rawStatus === "logged_out") state = "disconnected";

  // Continuous auto-reconnect: when disconnected, fire one /connect attempt
  // (rate-limited to once per minute per instance) before reporting back.
  // Caller can opt out with ?noAutoReconnect=true.
  const url = new URL(req.url);
  const noAuto = url.searchParams.get("noAutoReconnect") === "true";
  if (state === "disconnected" && !noAuto) {
    const lastAttempt = autoReconnectCooldown.get(config.serverUrl) ?? 0;
    if (Date.now() - lastAttempt > AUTO_RECONNECT_COOLDOWN_MS) {
      autoReconnectCooldown.set(config.serverUrl, Date.now());
      const reconnectResult = await connectUazapiInstance(config.serverUrl, config.token);
      if (reconnectResult.success) {
        state = "connecting";
        return NextResponse.json({
          state,
          connected: false,
          rawStatus: reconnectResult.status ?? "connecting",
          phone: result.phone,
          name: result.name,
          autoReconnectTriggered: true,
        });
      }
    }
  }

  return NextResponse.json({
    state,
    connected: result.connected,
    rawStatus: result.status,
    phone: result.phone,
    name: result.name,
    error: result.error,
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const config = await loadUazapiConfig();
  if (!config) {
    return NextResponse.json({ error: "Uazapi nao configurado" }, { status: 400 });
  }

  if (action === "reconnect") {
    const result = await connectUazapiInstance(config.serverUrl, config.token);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
}
