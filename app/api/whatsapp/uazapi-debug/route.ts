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

  // First, fetch a real chatid we can use in subsequent probes
  const sampleChats = await rawCall(serverUrl, token, "POST", "/chat/find", {
    limit: 5,
    sort: "-wa_lastMsgTimestamp",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstChatId = (sampleChats.data as any)?.chats?.[0]?.wa_chatid as string | undefined;

  const probes = await Promise.all([
    // Connection state
    rawCall(serverUrl, token, "GET", "/instance/status"),
    rawCall(serverUrl, token, "GET", "/webhook"),

    // Sample chat (already fetched above)
    Promise.resolve(sampleChats),

    // Messages WITHOUT chatid filter — proves whether history is persisted
    rawCall(serverUrl, token, "POST", "/message/find", { limit: 5 }),

    // CRITICAL: try the SAME chatid in 3 different filter shapes so we know
    // exactly which one Uazapi understands. Same chatid for all three so we can
    // compare result counts directly.
    ...(firstChatId
      ? [
          // 1. Direct string match
          rawCall(serverUrl, token, "POST", "/message/find", {
            chatid: firstChatId,
            limit: 5,
          }),
          // 2. MongoDB-style $in (single value) — what we WERE using
          rawCall(serverUrl, token, "POST", "/message/find", {
            chatid: { $in: [firstChatId] },
            limit: 5,
          }),
          // 3. Regex partial match
          rawCall(serverUrl, token, "POST", "/message/find", {
            chatid: { $regex: firstChatId.split("@")[0] },
            limit: 5,
          }),
        ]
      : []),

    // Counts
    rawCall(serverUrl, token, "POST", "/chat/find", { limit: 1, count: true }),
  ]);

  // Build a high-level interpretation
  const messagesUnfiltered = probes.find(
    (p) => p.path === "/message/find" && JSON.stringify(p.body) === `{"limit":5}`
  );
  const messagesArr = (messagesUnfiltered?.data as { messages?: unknown[] } | undefined)?.messages;
  const totalMessagesAvailable = Array.isArray(messagesArr) ? messagesArr.length : 0;

  // Compare the 3 chatid filter variants to know which one upstream understands
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directMatch = probes.find((p) => typeof (p.body as any)?.chatid === "string");
  const inMatch = probes.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p) => Array.isArray((p.body as any)?.chatid?.$in)
  );
  const regexMatch = probes.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p) => typeof (p.body as any)?.chatid?.$regex === "string"
  );
  const countMsgs = (p?: Probe) => {
    const m = (p?.data as { messages?: unknown[] } | undefined)?.messages;
    return Array.isArray(m) ? m.length : 0;
  };

  const filterDiagnostic = {
    chatIdProbed: firstChatId ?? null,
    directStringMatch: countMsgs(directMatch),
    inOperatorMatch: countMsgs(inMatch),
    regexMatch: countMsgs(regexMatch),
    workingFilter:
      countMsgs(directMatch) > 0
        ? "string"
        : countMsgs(inMatch) > 0
          ? "$in"
          : countMsgs(regexMatch) > 0
            ? "$regex"
            : "none",
  };

  const interpretation = {
    instanceReachable: probes[0].ok === true,
    hasAnyMessageHistory: totalMessagesAvailable > 0,
    sampleMessageCount: totalMessagesAvailable,
    filterDiagnostic,
    likelyConclusion:
      totalMessagesAvailable === 0
        ? "Uazapi não está persistindo histórico de mensagens. Solução: ler /message do nosso DB Postgres."
        : filterDiagnostic.workingFilter === "string"
          ? "Filtro string direta funciona. Code já corrigido para usar este formato."
          : filterDiagnostic.workingFilter === "none"
            ? "Nenhum filtro chatid funcionou. Investigar formato esperado pelo Uazapi."
            : `Filtro ${filterDiagnostic.workingFilter} funciona — code precisa ser ajustado.`,
  };

  return NextResponse.json({
    serverUrl,
    timestamp: new Date().toISOString(),
    interpretation,
    probes,
  });
}
