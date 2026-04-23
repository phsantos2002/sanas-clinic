import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
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

  // Build expected webhook URL based on the current request origin
  const reqUrl = new URL(req.url);
  const currentOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || reqUrl.origin;
  const expectedWebhookUrl = `${currentOrigin}/api/webhook/evolution`;

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

  // ── AI / webhook health checks (DB side) ─────────────────
  const aiConfig = await prisma.aIConfig.findUnique({ where: { userId: dbUser.id } });
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [lastIncoming, lastAssistant, dlqRecent, msgsLast24h] = await Promise.all([
    prisma.message.findFirst({
      where: { lead: { userId: dbUser.id }, role: "user" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, content: true, leadId: true },
    }),
    prisma.message.findFirst({
      where: { lead: { userId: dbUser.id }, role: "assistant" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, content: true, leadId: true },
    }),
    prisma.webhookDLQ.count({
      where: { OR: [{ userId: dbUser.id }, { userId: null }], createdAt: { gte: last24h } },
    }),
    prisma.message.count({
      where: { lead: { userId: dbUser.id }, role: "user", createdAt: { gte: last24h } },
    }),
  ]);

  // Inspect the LAST lead that received a message — the most common cause of
  // "webhook arrived but AI didn't reply" is a per-lead flag blocking it.
  let lastLeadDiagnostic: {
    leadId: string;
    name: string;
    phone: string;
    aiEnabled: boolean;
    humanPausedUntil: Date | null;
    humanPaused: boolean;
    onBlacklist: boolean;
    onWhitelist: boolean | null;
    lastMessageAt: Date | null;
    lastMessageText: string | null;
    inferredBlocker: string | null;
  } | null = null;

  if (lastIncoming?.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: lastIncoming.leadId },
      select: {
        id: true,
        name: true,
        phone: true,
        aiEnabled: true,
        humanPausedUntil: true,
      },
    });

    if (lead) {
      const normalizedPhone = lead.phone.replace(/\D/g, "");
      const blacklist = (aiConfig?.blacklist ?? []) as string[];
      const whitelist = (aiConfig?.whitelist ?? []) as string[];
      const onBlacklist = blacklist.some((b) =>
        b.replace(/\D/g, "").endsWith(normalizedPhone.slice(-8))
      );
      const onWhitelist =
        whitelist.length > 0
          ? whitelist.some((w) => w.replace(/\D/g, "").endsWith(normalizedPhone.slice(-8)))
          : null; // no whitelist configured
      const humanPaused = !!lead.humanPausedUntil && new Date(lead.humanPausedUntil) > new Date();

      let inferredBlocker: string | null = null;
      if (!lead.aiEnabled) inferredBlocker = "lead.aiEnabled = false";
      else if (humanPaused) inferredBlocker = `humanPausedUntil (${lead.humanPausedUntil})`;
      else if (onBlacklist) inferredBlocker = "phone na blacklist do AIConfig";
      else if (onWhitelist === false)
        inferredBlocker = "whitelist configurada mas phone não está nela";
      else if (!aiConfig?.apiKey) inferredBlocker = "AIConfig.apiKey vazia";

      lastLeadDiagnostic = {
        leadId: lead.id,
        name: lead.name,
        phone: normalizedPhone.slice(0, 2) + "***" + normalizedPhone.slice(-4),
        aiEnabled: lead.aiEnabled,
        humanPausedUntil: lead.humanPausedUntil,
        humanPaused,
        onBlacklist,
        onWhitelist,
        lastMessageAt: lastIncoming.createdAt,
        lastMessageText: lastIncoming.content.slice(0, 80),
        inferredBlocker,
      };
    }
  }

  const webhookProbe = probes.find((p) => p.path === "/webhook");
  const configuredWebhookUrl =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (webhookProbe?.data as any)?.[0]?.url ?? null;
  const webhookUrlMatches = configuredWebhookUrl === expectedWebhookUrl;

  const aiHealth = {
    aiConfigured: !!aiConfig,
    aiKeyPresent: !!aiConfig?.apiKey,
    aiProvider: aiConfig?.provider ?? null,
    aiModel: aiConfig?.model ?? null,
    webhookUrl: {
      expected: expectedWebhookUrl,
      configured: configuredWebhookUrl,
      matches: webhookUrlMatches,
    },
    lastIncomingAt: lastIncoming?.createdAt ?? null,
    lastIncomingPreview: lastIncoming?.content?.slice(0, 80) ?? null,
    lastAssistantAt: lastAssistant?.createdAt ?? null,
    lastAssistantPreview: lastAssistant?.content?.slice(0, 80) ?? null,
    msgsReceivedLast24h: msgsLast24h,
    dlqEntriesLast24h: dlqRecent,
    lastLeadDiagnostic,
    // AIConfig-level filters that might block everyone
    whitelistSize: (aiConfig?.whitelist ?? []).length,
    blacklistSize: (aiConfig?.blacklist ?? []).length,
    ignoreGroups: aiConfig?.ignoreGroups ?? null,
  };

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

  // Build a high-level diagnosis of why the AI may not be replying
  const aiBlockers: string[] = [];
  if (!aiHealth.aiConfigured) aiBlockers.push("AIConfig não existe");
  else if (!aiHealth.aiKeyPresent) aiBlockers.push("Chave OpenAI vazia em Settings → IA Chat");
  if (!aiHealth.webhookUrl.matches) {
    aiBlockers.push(
      `Webhook do Uazapi aponta para domínio errado (${aiHealth.webhookUrl.configured}) — atualize para ${aiHealth.webhookUrl.expected}`
    );
  }
  if (aiHealth.msgsReceivedLast24h === 0) {
    aiBlockers.push(
      "Nenhuma mensagem recebida via webhook nas últimas 24h — webhook não está chegando ou ninguém mandou nada"
    );
  }
  // If messages ARE arriving but the AI isn't replying, surface the per-lead blocker
  if (aiHealth.msgsReceivedLast24h > 0 && lastLeadDiagnostic?.inferredBlocker) {
    aiBlockers.push(
      `Último lead (${lastLeadDiagnostic.name}): ${lastLeadDiagnostic.inferredBlocker}`
    );
  }

  const interpretation = {
    instanceReachable: probes[0].ok === true,
    hasAnyMessageHistory: totalMessagesAvailable > 0,
    sampleMessageCount: totalMessagesAvailable,
    filterDiagnostic,
    aiHealth,
    aiBlockers,
    likelyConclusion:
      aiBlockers.length > 0
        ? `IA bloqueada: ${aiBlockers[0]}`
        : totalMessagesAvailable === 0
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
