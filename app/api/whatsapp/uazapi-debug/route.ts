import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/whatsapp/uazapi-debug
 *
 * Exploratory diagnostic that fires multiple Uazapi endpoints in parallel and
 * returns a single structured JSON. Used to:
 *  - Confirm what fields the instance returns (status, info)
 *  - Test if /message/find returns ANY messages without filter (proves whether
 *    the upstream actually has history persisted)
 *  - Probe undocumented endpoints (/instance/sync, /chat/sync) to see if a
 *    history resync is exposed
 *
 * Inline helper (no retry) — we want raw responses for diagnostic purposes,
 * not the polished output of the resilient helper.
 */

const TIMEOUT_MS = 10_000;

type Probe = {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  durationMs?: number;
  status?: number;
  ok?: boolean;
  data?: unknown;
  error?: string;
};

async function rawCall(
  serverUrl: string,
  token: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<Probe> {
  const probe: Probe = { path, method, body };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const headers: Record<string, string> = { token: token.trim() };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${serverUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    probe.durationMs = Date.now() - started;
    probe.status = res.status;
    probe.ok = res.ok;
    const text = await res.text();
    try {
      probe.data = JSON.parse(text);
    } catch {
      probe.data = text.slice(0, 1000);
    }
  } catch (err) {
    clearTimeout(timer);
    probe.durationMs = Date.now() - started;
    probe.error = err instanceof Error ? err.message : String(err);
  }
  return probe;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (
    !config ||
    config.provider !== "uazapi" ||
    !config.uazapiServerUrl ||
    !config.uazapiInstanceToken
  ) {
    return NextResponse.json({ error: "Uazapi não configurado" }, { status: 400 });
  }

  const serverUrl = config.uazapiServerUrl.trim().replace(/\/+$/, "");
  const token = config.uazapiInstanceToken.trim();

  const probes = await Promise.all([
    // Connection state
    rawCall(serverUrl, token, "GET", "/instance/status"),
    rawCall(serverUrl, token, "GET", "/instance/info"),
    rawCall(serverUrl, token, "GET", "/instance"),
    rawCall(serverUrl, token, "GET", "/webhook"),

    // Chats sample (first chat with all fields)
    rawCall(serverUrl, token, "POST", "/chat/find", {
      limit: 2,
      sort: "-wa_lastMsgTimestamp",
    }),

    // Messages WITHOUT chatid filter — proves whether history is persisted at all
    rawCall(serverUrl, token, "POST", "/message/find", { limit: 5 }),

    // Messages with messageTimestamp range (alternative filter)
    rawCall(serverUrl, token, "POST", "/message/find", {
      limit: 5,
      messageTimestamp: { $gt: 0 },
    }),

    // Speculative resync endpoints (likely 404, but worth probing)
    rawCall(serverUrl, token, "POST", "/instance/sync", {}),
    rawCall(serverUrl, token, "POST", "/chat/sync", {}),
    rawCall(serverUrl, token, "POST", "/message/sync", {}),
    rawCall(serverUrl, token, "GET", "/instance/version"),

    // Counts (if supported)
    rawCall(serverUrl, token, "POST", "/chat/find", { limit: 1, count: true }),
    rawCall(serverUrl, token, "POST", "/message/find", { limit: 1, count: true }),
  ]);

  // Build a high-level interpretation
  const messagesUnfiltered = probes.find(
    (p) => p.path === "/message/find" && JSON.stringify(p.body) === `{"limit":5}`
  );
  const messagesArr = (messagesUnfiltered?.data as { messages?: unknown[] } | undefined)?.messages;
  const totalMessagesAvailable = Array.isArray(messagesArr) ? messagesArr.length : 0;

  const interpretation = {
    instanceReachable: probes[0].ok === true,
    hasAnyMessageHistory: totalMessagesAvailable > 0,
    sampleMessageCount: totalMessagesAvailable,
    likelyConclusion:
      totalMessagesAvailable === 0
        ? "Uazapi não está persistindo histórico de mensagens. Solução: ler /message do nosso DB Postgres."
        : "Uazapi tem mensagens armazenadas — investigar por que o filtro chatid não bate.",
  };

  return NextResponse.json({
    serverUrl,
    timestamp: new Date().toISOString(),
    interpretation,
    probes,
  });
}
