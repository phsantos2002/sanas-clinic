import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { canRequest, recordSuccess, recordFailure } from "@/lib/uazapi/circuitBreaker";

/**
 * Proxy API for Uazapi — FULL integration (every feature)
 *
 * GET actions:
 *   ?action=chats            &limit=200&offset=0&type=groups&search=nome&archived=true&pinned=true&unread=true
 *   ?action=messages          &chatid=xxx&limit=100&offset=0&search=texto&starred=true&afterTs=123
 *   ?action=starred-messages  &chatid=xxx (optional)&limit=100
 *   ?action=media-messages    &chatid=xxx&mediaType=image&limit=50
 *   ?action=details           &number=5511999999999
 *   ?action=status
 *   ?action=contacts          &limit=500&offset=0
 *   ?action=download          &messageid=xxx
 *   ?action=group-info        &groupid=xxx@g.us
 *   ?action=group-participants &groupid=xxx@g.us
 *   ?action=group-invite-link &groupid=xxx@g.us
 *   ?action=check-number      &number=5511999999999
 *   ?action=profile-pic       &number=5511999999999
 *   ?action=business-profile  &number=5511999999999
 *   ?action=labels
 *   ?action=blocked
 *   ?action=webhook
 *
 * POST actions (via body):
 *   ?action=mark-read         { chatid }
 *   ?action=mark-unread       { chatid }
 *   ?action=typing            { chatid, typing: boolean }
 *   ?action=recording         { chatid, recording: boolean }
 *   ?action=reaction          { chatid, messageid, emoji }
 *   ?action=delete-msg        { chatid, messageid, forEveryone }
 *   ?action=star-msg          { chatid, messageid, star }
 *   ?action=forward-msg       { chatid, messageid, toNumber }
 *   ?action=edit-msg          { chatid, messageid, text }
 *   ?action=pin-chat          { chatid, pin }
 *   ?action=archive-chat      { chatid, archive }
 *   ?action=mute-chat         { chatid, mute, duration? }
 *   ?action=clear-chat        { chatid }
 *   ?action=delete-chat       { chatid }
 *   ?action=block-contact     { number }
 *   ?action=unblock-contact   { number }
 *   ?action=label-add         { chatid, labelid }
 *   ?action=label-remove      { chatid, labelid }
 *   ?action=group-add         { groupid, number }
 *   ?action=group-remove      { groupid, number }
 *   ?action=group-promote     { groupid, number }
 *   ?action=group-demote      { groupid, number }
 *   ?action=group-subject     { groupid, subject }
 *   ?action=group-desc        { groupid, description }
 *   ?action=group-settings    { groupid, announce?, restrict? }
 *   ?action=group-leave       { groupid }
 *   ?action=group-revoke-link { groupid }
 *   ?action=status-text       { text, backgroundColor? }
 *   ?action=status-image      { file, caption? }
 *   ?action=status-video      { file, caption? }
 */

async function getUazapiConfig() {
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
    userId: dbUser.id,
    serverUrl: config.uazapiServerUrl.trim().replace(/\/+$/, ""),
    token: config.uazapiInstanceToken.trim(),
  };
}

// ── Resilient Uazapi helper ──────────────────────────────────
// Adds timeout, retry with exponential backoff and structured logging.
// All call sites get the parsed body for compat; check `__error` field for failures.

const UAZAPI_TIMEOUT_MS = 15_000;
const UAZAPI_MAX_RETRIES = 2; // total attempts = 1 + retries
const UAZAPI_RETRY_BASE_MS = 500;

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uazapi(
  serverUrl: string,
  token: string,
  method: string,
  path: string,
  body?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  // Circuit breaker keyed by serverUrl — fast-fail when Uazapi is degraded
  const circuitKey = serverUrl;
  if (!canRequest(circuitKey)) {
    console.warn(JSON.stringify({ event: "uazapi_circuit_open_skip", path }));
    return { __error: "Circuit breaker aberto — Uazapi em degradação", __status: 503 };
  }

  const headers: Record<string, string> = { token: token.trim() };
  if (body) headers["Content-Type"] = "application/json";
  const url = `${serverUrl}${path}`;
  const payload = body ? JSON.stringify(body) : undefined;

  let lastError: { message: string; status?: number } | null = null;

  for (let attempt = 0; attempt <= UAZAPI_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UAZAPI_TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
      clearTimeout(timer);
      const durationMs = Date.now() - started;

      if (res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        if (attempt > 0) {
          console.log(
            JSON.stringify({
              event: "uazapi_retry_ok",
              path,
              status: res.status,
              attempt,
              durationMs,
            })
          );
        }
        recordSuccess(circuitKey);
        return { ...data, __status: res.status };
      }

      // Read error body once (for surfacing/logging)
      const errBody = await res.text().catch(() => "");
      lastError = { message: errBody || res.statusText, status: res.status };

      // Non-retriable: return immediately with error info surfaced
      if (!isRetriableStatus(res.status)) {
        console.error(
          JSON.stringify({
            event: "uazapi_error",
            path,
            status: res.status,
            attempt,
            durationMs,
            error: errBody.slice(0, 300),
          })
        );
        return { __error: errBody || res.statusText, __status: res.status };
      }
      // Retriable — fall through to backoff
      console.warn(
        JSON.stringify({ event: "uazapi_retry", path, status: res.status, attempt, durationMs })
      );
    } catch (err) {
      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const isAbort = err instanceof Error && err.name === "AbortError";
      const message = isAbort
        ? `timeout after ${UAZAPI_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
      lastError = { message };
      console.warn(
        JSON.stringify({ event: "uazapi_network_error", path, attempt, durationMs, error: message })
      );
    }

    if (attempt < UAZAPI_MAX_RETRIES) {
      const delay = UAZAPI_RETRY_BASE_MS * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  console.error(
    JSON.stringify({
      event: "uazapi_exhausted",
      path,
      attempts: UAZAPI_MAX_RETRIES + 1,
      error: lastError?.message,
    })
  );
  recordFailure(circuitKey);
  return { __error: lastError?.message ?? "Uazapi unreachable", __status: lastError?.status };
}

// ── Avatar cache (DB-backed, persists across cold starts) ─────
// Avoids re-querying Uazapi /chat/details for every chat on each poll.
const AVATAR_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

async function loadAvatarCache(
  userId: string,
  phones: string[]
): Promise<Map<string, { imagePreview: string; image: string }>> {
  if (phones.length === 0) return new Map();
  const minFetchedAt = new Date(Date.now() - AVATAR_TTL_MS);
  const rows = await prisma.whatsAppAvatarCache.findMany({
    where: {
      userId,
      phone: { in: phones },
      fetchedAt: { gte: minFetchedAt },
      // Only return entries that actually have an avatar; empties are not cached.
      OR: [{ imagePreview: { not: "" } }, { image: { not: "" } }],
    },
    select: { phone: true, imagePreview: true, image: true },
  });
  return new Map(rows.map((r) => [r.phone, { imagePreview: r.imagePreview, image: r.image }]));
}

async function saveAvatarCache(
  userId: string,
  entries: { phone: string; imagePreview: string; image: string }[]
) {
  if (entries.length === 0) return;
  // Skip empty avatars — we want to retry these on the next request rather than
  // permanently treating "no avatar yet" as a final answer.
  const real = entries.filter((e) => e.imagePreview || e.image);
  if (real.length === 0) return;
  await Promise.allSettled(
    real.map((e) =>
      prisma.whatsAppAvatarCache.upsert({
        where: { userId_phone: { userId, phone: e.phone } },
        update: { imagePreview: e.imagePreview, image: e.image, fetchedAt: new Date() },
        create: {
          userId,
          phone: e.phone,
          imagePreview: e.imagePreview,
          image: e.image,
        },
      })
    )
  );
}

export async function GET(req: NextRequest) {
  const config = await getUazapiConfig();
  if (!config) return NextResponse.json({ error: "Nao configurado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "chats": {
        const limit = parseInt(searchParams.get("limit") ?? "200");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const search = searchParams.get("search") ?? "";
        const pinned = searchParams.get("pinned") === "true";
        const unread = searchParams.get("unread") === "true";
        // Optional filters — when omitted, returns ALL chats (groups + personal, including archived)
        const typeParam = searchParams.get("type"); // "groups" | "personal" | null/all
        const archivedParam = searchParams.get("archived"); // "true" | "false" | null/both

        const body: Record<string, unknown> = {
          sort: "-wa_lastMsgTimestamp",
          limit,
          offset,
        };
        // Only filter by group flag if explicitly requested
        if (typeParam === "groups") body.wa_isGroup = true;
        else if (typeParam === "personal") body.wa_isGroup = false;
        // Only filter by archive state if explicitly requested
        if (archivedParam === "true") body.wa_archived = true;
        else if (archivedParam === "false") body.wa_archived = false;
        if (search) body.wa_contactName = `~${search}`;
        if (pinned) body.wa_pinned = true;
        if (unread) body.wa_unreadCount = { $gt: 0 };

        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/find", body);
        if (data?.__error) {
          return NextResponse.json(
            {
              chats: [],
              total: 0,
              upstreamError: String(data.__error),
              upstreamStatus: data.__status,
            },
            { status: 502 }
          );
        }
        const chats = (
          Array.isArray(data?.chats) ? data.chats : Array.isArray(data) ? data : []
        ) as Record<string, unknown>[];

        // Phones we may need avatars for
        const phonesToCheck: string[] = [];
        for (const chat of chats) {
          if (!chat.wa_chatid) continue;
          if (!chat.imagePreview && !chat.image) {
            phonesToCheck.push((chat.wa_chatid as string).split("@")[0]);
          }
        }

        // Hydrate from DB cache first
        const cache = await loadAvatarCache(config.userId, phonesToCheck);
        for (const chat of chats) {
          if (!chat.wa_chatid) continue;
          const phone = (chat.wa_chatid as string).split("@")[0];
          if (!chat.imagePreview && !chat.image) {
            const cached = cache.get(phone);
            if (cached) {
              chat.imagePreview = cached.imagePreview;
              chat.image = cached.image;
            }
          }
        }

        // Enrich any remaining (cache miss) chats with profile pics, batched.
        const toEnrich = chats.filter(
          (c: Record<string, unknown>) => !c.imagePreview && !c.image && c.wa_chatid
        );
        const newlyFetched: { phone: string; imagePreview: string; image: string }[] = [];
        const ENRICH_CONCURRENCY = 25;
        for (let i = 0; i < toEnrich.length; i += ENRICH_CONCURRENCY) {
          const batch = toEnrich.slice(i, i + ENRICH_CONCURRENCY);
          await Promise.allSettled(
            batch.map(async (chat: Record<string, unknown>) => {
              const phone = (chat.wa_chatid as string).split("@")[0];
              try {
                const detail = await uazapi(
                  config.serverUrl,
                  config.token,
                  "POST",
                  "/chat/details",
                  { number: phone, preview: true }
                );
                const imagePreview = detail.imagePreview || "";
                const image = detail.image || "";
                chat.imagePreview = imagePreview;
                chat.image = image;
                newlyFetched.push({ phone, imagePreview, image });
              } catch {
                /* skip */
              }
            })
          );
        }

        // Persist newly fetched avatars (fire-and-forget — don't block response)
        if (newlyFetched.length > 0) {
          saveAvatarCache(config.userId, newlyFetched).catch(() => {});
        }

        return NextResponse.json({ chats, total: data.pagination?.total ?? chats.length });
      }

      case "messages": {
        const chatid = searchParams.get("chatid") ?? "";
        const limit = parseInt(searchParams.get("limit") ?? "100");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const search = searchParams.get("search") ?? "";
        const starred = searchParams.get("starred") === "true";
        const afterTs = searchParams.get("afterTs");

        // Message.chatid in Uazapi can be stored as "@s.whatsapp.net" OR legacy
        // "@c.us" depending on history age. Match both via $in. Group ids use
        // "@g.us" with no aliases.
        const phoneOnly = chatid.split("@")[0];
        const isGroup = chatid.includes("@g.us");
        const chatIdVariants = isGroup
          ? [chatid]
          : Array.from(new Set([`${phoneOnly}@s.whatsapp.net`, `${phoneOnly}@c.us`, chatid]));

        const body: Record<string, unknown> = {
          chatid: { $in: chatIdVariants },
          limit,
          offset,
        };
        if (search) body.text = `~${search}`;
        if (starred) body.isStarred = true;
        if (afterTs) body.messageTimestamp = { $gt: parseInt(afterTs) };

        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/find", body);
        const rawMessages = Array.isArray(data?.messages)
          ? data.messages
          : Array.isArray(data)
            ? data
            : [];

        // Defensive server-side filter: only return messages whose chatid matches
        // one of our expected variants. Defends against Uazapi ignoring the
        // filter and returning a broader result set.
        const expectedSet = new Set(chatIdVariants);
        const messages = rawMessages.filter((m: Record<string, unknown>) => {
          const mid = m?.chatid as string | undefined;
          if (!mid) return false; // drop messages without chatid (cannot verify)
          return expectedSet.has(mid);
        });

        return NextResponse.json({
          messages,
          total: messages.length,
          ...(data?.__error
            ? { upstreamError: String(data.__error), upstreamStatus: data.__status }
            : {}),
          ...(data?.error ? { upstreamError: String(data.error) } : {}),
        });
      }

      case "starred-messages": {
        const chatid = searchParams.get("chatid");
        const limit = parseInt(searchParams.get("limit") ?? "100");
        const body: Record<string, unknown> = { isStarred: true, limit };
        if (chatid) {
          const phoneOnly = chatid.split("@")[0];
          const isGroup = chatid.includes("@g.us");
          body.chatid = {
            $in: isGroup
              ? [chatid]
              : Array.from(new Set([`${phoneOnly}@s.whatsapp.net`, `${phoneOnly}@c.us`, chatid])),
          };
        }
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/find", body);
        return NextResponse.json({ messages: data.messages ?? data ?? [] });
      }

      case "media-messages": {
        const chatid = searchParams.get("chatid") ?? "";
        const mediaType = searchParams.get("mediaType");
        const limit = parseInt(searchParams.get("limit") ?? "50");
        const phoneOnly = chatid.split("@")[0];
        const isGroup = chatid.includes("@g.us");
        const body: Record<string, unknown> = {
          chatid: {
            $in: isGroup
              ? [chatid]
              : Array.from(new Set([`${phoneOnly}@s.whatsapp.net`, `${phoneOnly}@c.us`, chatid])),
          },
          limit,
        };
        if (mediaType) {
          body.messageType = mediaType;
        } else {
          body.messageType = { $in: ["image", "video", "audio", "ptt", "document", "sticker"] };
        }
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/find", body);
        return NextResponse.json({ messages: data.messages ?? data ?? [] });
      }

      case "details": {
        const number = searchParams.get("number") ?? "";
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/details", {
          number,
          preview: true,
        });
        return NextResponse.json(data);
      }

      case "status": {
        const data = await uazapi(config.serverUrl, config.token, "GET", "/instance/status");
        return NextResponse.json(data);
      }

      case "contacts": {
        const limit = parseInt(searchParams.get("limit") ?? "500");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const data = await uazapi(config.serverUrl, config.token, "POST", "/contact/find", {
          limit,
          offset,
        });
        return NextResponse.json({
          contacts: data.contacts ?? data ?? [],
          total: data.pagination?.total,
        });
      }

      case "download": {
        const messageid = searchParams.get("messageid") ?? "";
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/download", {
          messageid,
        });
        return NextResponse.json(data);
      }

      case "check-number": {
        const number = (searchParams.get("number") ?? "").replace(/\D/g, "");
        const data = await uazapi(config.serverUrl, config.token, "POST", "/contact/check", {
          number,
        });
        return NextResponse.json({
          exists: data.exists ?? data.numberExists ?? !!data.jid,
          jid: data.jid,
        });
      }

      case "profile-pic": {
        const number = (searchParams.get("number") ?? "").replace(/\D/g, "");
        const data = await uazapi(config.serverUrl, config.token, "POST", "/contact/profile-pic", {
          number,
        });
        return NextResponse.json({ url: data.url ?? data.imgUrl ?? data.profilePic });
      }

      case "business-profile": {
        const number = (searchParams.get("number") ?? "").replace(/\D/g, "");
        const data = await uazapi(
          config.serverUrl,
          config.token,
          "POST",
          "/contact/business-profile",
          { number }
        );
        return NextResponse.json(data);
      }

      case "group-info": {
        const groupid = searchParams.get("groupid") ?? "";
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/info", {
          groupid,
        });
        return NextResponse.json(data);
      }

      case "group-participants": {
        const groupid = searchParams.get("groupid") ?? "";
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/participants", {
          groupid,
        });
        return NextResponse.json(data);
      }

      case "group-invite-link": {
        const groupid = searchParams.get("groupid") ?? "";
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/invite-link", {
          groupid,
        });
        return NextResponse.json(data);
      }

      case "labels": {
        const data = await uazapi(config.serverUrl, config.token, "GET", "/label/all");
        return NextResponse.json(data);
      }

      case "blocked": {
        const data = await uazapi(config.serverUrl, config.token, "GET", "/contact/blocked");
        return NextResponse.json(data);
      }

      case "webhook": {
        const data = await uazapi(config.serverUrl, config.token, "GET", "/webhook");
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
    }
  } catch (err) {
    console.error("[whatsapp proxy]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const config = await getUazapiConfig();
  if (!config) return NextResponse.json({ error: "Nao configurado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");
  const body = await req.json();

  try {
    switch (action) {
      // ─── Message actions ───
      case "mark-read": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/read", {
          chatid: body.chatid,
        });
        return NextResponse.json({ success: true, data });
      }

      case "mark-unread": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/unread", {
          chatid: body.chatid,
        });
        return NextResponse.json({ success: true, data });
      }

      case "typing": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/presence", {
          chatid: body.chatid,
          presence: body.typing ? "composing" : "paused",
        });
        return NextResponse.json({ success: true, data });
      }

      case "recording": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/presence", {
          chatid: body.chatid,
          presence: body.recording ? "recording" : "paused",
        });
        return NextResponse.json({ success: true, data });
      }

      case "reaction": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/send/reaction", {
          chatid: body.chatid,
          messageid: body.messageid,
          reaction: body.emoji,
        });
        return NextResponse.json({ success: true, data });
      }

      case "delete-msg": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/delete", {
          chatid: body.chatid,
          messageid: body.messageid,
          forEveryone: body.forEveryone ?? false,
        });
        return NextResponse.json({ success: true, data });
      }

      case "star-msg": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/star", {
          chatid: body.chatid,
          messageid: body.messageid,
          star: body.star ?? true,
        });
        return NextResponse.json({ success: true, data });
      }

      case "forward-msg": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/forward", {
          chatid: body.chatid,
          messageid: body.messageid,
          number: (body.toNumber ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      case "edit-msg": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/edit", {
          chatid: body.chatid,
          messageid: body.messageid,
          text: body.text,
        });
        return NextResponse.json({ success: true, data });
      }

      // ─── Chat management ───
      // Uazapi schema uses wa_chatid; we send both keys for max compat.
      case "pin-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/pin", {
          chatid: body.chatid,
          wa_chatid: body.chatid,
          pin: body.pin ?? true,
        });
        if (data?.__error) {
          return NextResponse.json(
            { success: false, error: data.__error, status: data.__status },
            { status: data.__status ?? 502 }
          );
        }
        return NextResponse.json({ success: true, data });
      }

      case "archive-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/archive", {
          chatid: body.chatid,
          wa_chatid: body.chatid,
          archive: body.archive ?? true,
        });
        if (data?.__error) {
          return NextResponse.json(
            { success: false, error: data.__error, status: data.__status },
            { status: data.__status ?? 502 }
          );
        }
        return NextResponse.json({ success: true, data });
      }

      case "mute-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/mute", {
          chatid: body.chatid,
          wa_chatid: body.chatid,
          mute: body.mute ?? true,
          duration: body.duration ?? 28800,
        });
        if (data?.__error) {
          return NextResponse.json(
            { success: false, error: data.__error, status: data.__status },
            { status: data.__status ?? 502 }
          );
        }
        return NextResponse.json({ success: true, data });
      }

      case "clear-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/clear", {
          chatid: body.chatid,
          wa_chatid: body.chatid,
        });
        return NextResponse.json({ success: true, data });
      }

      case "delete-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/delete", {
          chatid: body.chatid,
          wa_chatid: body.chatid,
        });
        return NextResponse.json({ success: true, data });
      }

      // ─── Contact management ───
      case "block-contact": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/contact/block", {
          number: (body.number ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      case "unblock-contact": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/contact/unblock", {
          number: (body.number ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      // ─── Labels ───
      case "label-add": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/label/add", {
          chatid: body.chatid,
          labelid: body.labelid,
        });
        return NextResponse.json({ success: true, data });
      }

      case "label-remove": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/label/remove", {
          chatid: body.chatid,
          labelid: body.labelid,
        });
        return NextResponse.json({ success: true, data });
      }

      // ─── Group management ───
      case "group-add": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/add", {
          groupid: body.groupid,
          number: (body.number ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-remove": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/remove", {
          groupid: body.groupid,
          number: (body.number ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-promote": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/promote", {
          groupid: body.groupid,
          number: (body.number ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-demote": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/demote", {
          groupid: body.groupid,
          number: (body.number ?? "").replace(/\D/g, ""),
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-subject": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/subject", {
          groupid: body.groupid,
          subject: body.subject,
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-desc": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/description", {
          groupid: body.groupid,
          description: body.description,
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-settings": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/settings", {
          groupid: body.groupid,
          announce: body.announce,
          restrict: body.restrict,
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-leave": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/leave", {
          groupid: body.groupid,
        });
        return NextResponse.json({ success: true, data });
      }

      case "group-revoke-link": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/group/revoke-invite", {
          groupid: body.groupid,
        });
        return NextResponse.json({ success: true, data });
      }

      // ─── Status/Stories ───
      case "status-text": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/status/text", {
          text: body.text,
          backgroundColor: body.backgroundColor ?? "#075E54",
        });
        return NextResponse.json({ success: true, data });
      }

      case "status-image": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/status/media", {
          type: "image",
          file: body.file,
          caption: body.caption ?? "",
        });
        return NextResponse.json({ success: true, data });
      }

      case "status-video": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/status/media", {
          type: "video",
          file: body.file,
          caption: body.caption ?? "",
        });
        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
    }
  } catch (err) {
    console.error("[whatsapp proxy POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
