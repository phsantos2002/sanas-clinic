/**
 * Uazapi (uazapiGO v2) — WhatsApp API — FULL Integration
 * Every endpoint, every feature, maximum extraction.
 * Docs: https://docs.uazapi.com
 */

export type UazapiConfig = {
  serverUrl: string;
  adminToken: string;
  instanceToken: string;
};

// ─── Helper (resilient: timeout + retry + logging + circuit breaker) ───

import { canRequest, recordSuccess, recordFailure } from "@/lib/uazapi/circuitBreaker";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2; // total attempts = 1 + retries
const RETRY_BASE_MS = 500;

function isRetriableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504;
}

// Paths that SEND a message or produce a WhatsApp-visible side effect — if
// the request times out, the server may have already dispatched the message
// even though our HTTP call aborted. Retrying causes double-sends. We still
// retry on explicit 429/503 (server told us it rejected), just not on
// ambiguous outcomes (network error / timeout / unknown).
function isSideEffectPath(path: string): boolean {
  return (
    path.startsWith("/send/") || path.startsWith("/message/send") || path.startsWith("/chat/") // pin/unpin/archive/markRead also mutate state
  );
}

async function uazapiRequest(
  serverUrl: string,
  token: string,
  method: string,
  path: string,
  body?: unknown
) {
  const sideEffect = method !== "GET" && isSideEffectPath(path);
  const cleanUrl = serverUrl.trim().replace(/\/+$/, "");
  const cleanToken = token.trim();

  // Circuit breaker: fast-fail when Uazapi is degraded
  if (!canRequest(cleanUrl)) {
    console.warn(JSON.stringify({ event: "uazapi_circuit_open_skip", path }));
    return {
      ok: false as const,
      status: 503,
      error: "Circuit breaker aberto — Uazapi em degradação",
    };
  }

  const headers: Record<string, string> = { token: cleanToken };
  if (body) headers["Content-Type"] = "application/json";
  const url = `${cleanUrl}${path}`;
  const payload = body ? JSON.stringify(body) : undefined;

  let lastError: { status?: number; message: string } = { message: "unknown" };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
      clearTimeout(timer);
      const durationMs = Date.now() - started;

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
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
        recordSuccess(cleanUrl);
        return { ok: true as const, data };
      }

      const errBody = await res.text().catch(() => "");
      lastError = { status: res.status, message: errBody || res.statusText };

      // For side-effect calls, only retry on statuses where the server
      // explicitly refused the request (429/503). Others (408/502/504) are
      // ambiguous — the upstream may have already executed the effect.
      const retriable = sideEffect
        ? res.status === 429 || res.status === 503
        : isRetriableStatus(res.status);

      if (!retriable) {
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
        return { ok: false as const, status: res.status, error: lastError.message };
      }
      console.warn(
        JSON.stringify({ event: "uazapi_retry", path, status: res.status, attempt, durationMs })
      );
    } catch (err) {
      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const isAbort = err instanceof Error && err.name === "AbortError";
      const message = isAbort
        ? `timeout after ${REQUEST_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
      lastError = { message };
      console.warn(
        JSON.stringify({ event: "uazapi_network_error", path, attempt, durationMs, error: message })
      );
      // Side-effect calls: we can't know whether the server already processed
      // the request before we timed out. Abort retries to avoid double-sends.
      if (sideEffect) {
        console.warn(
          JSON.stringify({ event: "uazapi_no_retry_side_effect", path, attempt, durationMs })
        );
        recordFailure(cleanUrl);
        return { ok: false as const, status: 0, error: lastError.message };
      }
    }

    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt));
    }
  }

  console.error(
    JSON.stringify({
      event: "uazapi_exhausted",
      path,
      attempts: MAX_RETRIES + 1,
      error: lastError.message,
    })
  );
  recordFailure(cleanUrl);
  return { ok: false as const, status: lastError.status ?? 0, error: lastError.message };
}

// ─── Instance management ───

export async function createUazapiInstance(
  serverUrl: string,
  adminToken: string,
  instanceName: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/instance/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", admintoken: adminToken },
      body: JSON.stringify({ name: instanceName }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }
    const data = await res.json();
    return { success: true, token: data.token };
  } catch {
    return { success: false, error: "Erro de conexao com Uazapi" };
  }
}

export async function connectUazapiInstance(
  serverUrl: string,
  token: string
): Promise<{ success: boolean; qrcode?: string; status?: string; error?: string }> {
  const r = await uazapiRequest(serverUrl, token, "POST", "/instance/connect", {});
  if (!r.ok) return { success: false, error: r.error };
  return {
    success: true,
    qrcode: r.data?.instance?.qrcode,
    status: r.data?.instance?.status,
  };
}

export async function getUazapiStatus(
  serverUrl: string,
  token: string
): Promise<{ connected: boolean; status?: string; phone?: string; name?: string; error?: string }> {
  const r = await uazapiRequest(serverUrl, token, "GET", "/instance/status");
  if (!r.ok) return { connected: false, error: r.error };
  const inst = r.data?.instance ?? r.data;
  return {
    connected: inst?.status === "connected",
    status: inst?.status,
    phone: inst?.phone,
    name: inst?.pushname,
  };
}

export async function disconnectUazapiInstance(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "POST", "/instance/disconnect");
}

export async function deleteUazapiInstance(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "DELETE", "/instance");
}

export async function restartUazapiInstance(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "POST", "/instance/restart");
}

// ─── Webhook ───

export async function setUazapiWebhook(
  serverUrl: string,
  token: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  // IMPORTANT: addUrlEvents=true makes Uazapi append the event name to the URL
  // (e.g. /api/webhook/evolution/messages), which Next.js treats as a distinct
  // route (404). Keeping addUrlEvents=false forces Uazapi to always POST to the
  // exact `url` regardless of event type — our handler detects the event from
  // the payload itself (EventType field).
  const r = await uazapiRequest(serverUrl, token, "POST", "/webhook", {
    enabled: true,
    url: webhookUrl,
    events: ["messages", "connection", "message_ack", "group_update", "call"],
    excludeMessages: ["wasSentByApi"],
    addUrlEvents: false,
  });
  return { success: r.ok, error: r.ok ? undefined : r.error };
}

export async function getUazapiWebhook(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "GET", "/webhook");
}

// ─── Send messages (all types) ───

export async function sendUazapiText(
  serverUrl: string,
  token: string,
  to: string,
  text: string,
  quotedMsgId?: string
) {
  const body: Record<string, unknown> = { number: to.replace(/\D/g, ""), text };
  if (quotedMsgId) body.quotedMsgId = quotedMsgId;
  return uazapiRequest(serverUrl, token, "POST", "/send/text", body);
}

export async function sendUazapiImage(
  serverUrl: string,
  token: string,
  to: string,
  imageUrl: string,
  caption?: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/media", {
    number: to.replace(/\D/g, ""),
    type: "image",
    file: imageUrl,
    caption: caption || "",
  });
}

export async function sendUazapiVideo(
  serverUrl: string,
  token: string,
  to: string,
  videoUrl: string,
  caption?: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/media", {
    number: to.replace(/\D/g, ""),
    type: "video",
    file: videoUrl,
    caption: caption || "",
  });
}

export async function sendUazapiDocument(
  serverUrl: string,
  token: string,
  to: string,
  fileUrl: string,
  fileName: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/media", {
    number: to.replace(/\D/g, ""),
    type: "document",
    file: fileUrl,
    fileName,
  });
}

export async function sendUazapiAudio(
  serverUrl: string,
  token: string,
  to: string,
  audioUrl: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/media", {
    number: to.replace(/\D/g, ""),
    type: "ptt",
    file: audioUrl,
  });
}

export async function sendUazapiSticker(
  serverUrl: string,
  token: string,
  to: string,
  stickerUrl: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/media", {
    number: to.replace(/\D/g, ""),
    type: "sticker",
    file: stickerUrl,
  });
}

export async function sendUazapiLocation(
  serverUrl: string,
  token: string,
  to: string,
  lat: number,
  lng: number,
  name?: string,
  address?: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/location", {
    number: to.replace(/\D/g, ""),
    lat,
    lng,
    name: name || "",
    address: address || "",
  });
}

export async function sendUazapiContact(
  serverUrl: string,
  token: string,
  to: string,
  contactName: string,
  contactPhone: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/contact", {
    number: to.replace(/\D/g, ""),
    contactName,
    contactNumber: contactPhone.replace(/\D/g, ""),
  });
}

export async function sendUazapiReaction(
  serverUrl: string,
  token: string,
  chatId: string,
  messageId: string,
  emoji: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/reaction", {
    chatid: chatId,
    messageid: messageId,
    reaction: emoji,
  });
}

export async function sendUazapiPoll(
  serverUrl: string,
  token: string,
  to: string,
  question: string,
  options: string[]
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/poll", {
    number: to.replace(/\D/g, ""),
    question,
    options,
  });
}

export async function sendUazapiBulkText(
  serverUrl: string,
  token: string,
  numbers: string[],
  text: string,
  delay?: number
) {
  return uazapiRequest(serverUrl, token, "POST", "/send/bulk/text", {
    numbers: numbers.map((n) => n.replace(/\D/g, "")),
    text,
    delay: delay ?? 3,
  });
}

// ─── Forward message ───

export async function forwardMessage(
  serverUrl: string,
  token: string,
  chatId: string,
  messageId: string,
  toNumber: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/message/forward", {
    chatid: chatId,
    messageid: messageId,
    number: toNumber.replace(/\D/g, ""),
  });
}

// ─── Edit message ───

export async function editMessage(
  serverUrl: string,
  token: string,
  chatId: string,
  messageId: string,
  newText: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/message/edit", {
    chatid: chatId,
    messageid: messageId,
    text: newText,
  });
}

// ─── Message actions ───

export async function markAsRead(serverUrl: string, token: string, chatId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/read", { chatid: chatId });
}

export async function markAsUnread(serverUrl: string, token: string, chatId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/unread", { chatid: chatId });
}

export async function setTyping(serverUrl: string, token: string, chatId: string, typing: boolean) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/presence", {
    chatid: chatId,
    presence: typing ? "composing" : "paused",
  });
}

export async function setRecording(
  serverUrl: string,
  token: string,
  chatId: string,
  recording: boolean
) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/presence", {
    chatid: chatId,
    presence: recording ? "recording" : "paused",
  });
}

export async function deleteMessage(
  serverUrl: string,
  token: string,
  chatId: string,
  messageId: string,
  forEveryone: boolean = false
) {
  return uazapiRequest(serverUrl, token, "POST", "/message/delete", {
    chatid: chatId,
    messageid: messageId,
    forEveryone,
  });
}

export async function starMessage(
  serverUrl: string,
  token: string,
  chatId: string,
  messageId: string,
  star: boolean
) {
  return uazapiRequest(serverUrl, token, "POST", "/message/star", {
    chatid: chatId,
    messageid: messageId,
    star,
  });
}

// ─── Chat management ───

export async function pinChat(serverUrl: string, token: string, chatId: string, pin: boolean) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/pin", {
    chatid: chatId,
    pin,
  });
}

export async function archiveChat(
  serverUrl: string,
  token: string,
  chatId: string,
  archive: boolean
) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/archive", {
    chatid: chatId,
    archive,
  });
}

export async function muteChat(
  serverUrl: string,
  token: string,
  chatId: string,
  mute: boolean,
  duration?: number
) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/mute", {
    chatid: chatId,
    mute,
    duration: duration ?? 28800, // 8h default
  });
}

export async function clearChat(serverUrl: string, token: string, chatId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/clear", { chatid: chatId });
}

export async function deleteChat(serverUrl: string, token: string, chatId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/chat/delete", { chatid: chatId });
}

// ─── Contact management ───

export async function checkNumberExists(
  serverUrl: string,
  token: string,
  number: string
): Promise<{ exists: boolean; jid?: string; error?: string }> {
  const r = await uazapiRequest(serverUrl, token, "POST", "/contact/check", {
    number: number.replace(/\D/g, ""),
  });
  if (!r.ok) return { exists: false, error: r.error };
  return {
    exists: r.data?.exists ?? r.data?.numberExists ?? !!r.data?.jid,
    jid: r.data?.jid,
  };
}

export async function blockContact(serverUrl: string, token: string, number: string) {
  return uazapiRequest(serverUrl, token, "POST", "/contact/block", {
    number: number.replace(/\D/g, ""),
  });
}

export async function unblockContact(serverUrl: string, token: string, number: string) {
  return uazapiRequest(serverUrl, token, "POST", "/contact/unblock", {
    number: number.replace(/\D/g, ""),
  });
}

export async function getBlockedContacts(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "GET", "/contact/blocked");
}

// ─── Profile ───

export async function getProfilePicture(serverUrl: string, token: string, number: string) {
  const r = await uazapiRequest(serverUrl, token, "POST", "/contact/profile-pic", {
    number: number.replace(/\D/g, ""),
  });
  if (!r.ok) return { success: false, error: r.error };
  return { success: true, url: r.data?.url ?? r.data?.imgUrl ?? r.data?.profilePic };
}

export async function getBusinessProfile(serverUrl: string, token: string, number: string) {
  return uazapiRequest(serverUrl, token, "POST", "/contact/business-profile", {
    number: number.replace(/\D/g, ""),
  });
}

export async function setMyProfileName(serverUrl: string, token: string, name: string) {
  return uazapiRequest(serverUrl, token, "POST", "/instance/profile/name", { name });
}

export async function setMyProfileStatus(serverUrl: string, token: string, status: string) {
  return uazapiRequest(serverUrl, token, "POST", "/instance/profile/status", { status });
}

export async function setMyProfilePicture(serverUrl: string, token: string, imageUrl: string) {
  return uazapiRequest(serverUrl, token, "POST", "/instance/profile/pic", { file: imageUrl });
}

// ─── Sync: chats, messages, contacts ───

export type UazapiChat = {
  id: string;
  wa_chatid: string;
  wa_contactName: string;
  wa_groupSubject?: string;
  wa_isGroup: boolean;
  wa_lastMsgTimestamp: number;
  wa_unreadCount: number;
  wa_lastMessageTextVote: string;
  wa_lastMessageSender: string;
  wa_lastMessageType: string;
  phone?: string;
  image?: string;
  imagePreview?: string;
  wa_pinned?: boolean;
  wa_archived?: boolean;
  wa_muted?: boolean;
};

export type UazapiMessage = {
  id: string;
  messageid: string;
  chatid: string;
  fromMe: boolean;
  text: string;
  messageTimestamp: number;
  messageType: string;
  sender: string;
  senderName?: string;
  quotedMsg?: { text?: string; sender?: string; messageType?: string; messageid?: string };
  mediaUrl?: string;
  mimetype?: string;
  fileName?: string;
  caption?: string;
  lat?: number;
  lng?: number;
  vcardName?: string;
  vcardPhone?: string;
  ack?: number; // 0=pending, 1=sent, 2=delivered, 3=read
  isStarred?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: { emoji: string; sender: string }[];
  pollOptions?: string[];
  pollVotes?: Record<string, number>;
};

export async function getUazapiChats(
  serverUrl: string,
  token: string,
  options: {
    isGroup?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
    archived?: boolean;
    pinned?: boolean;
    unreadOnly?: boolean;
  } = {}
): Promise<{ success: boolean; chats?: UazapiChat[]; total?: number; error?: string }> {
  const body: Record<string, unknown> = {
    sort: "-wa_lastMsgTimestamp",
    limit: options.limit ?? 200,
    offset: options.offset ?? 0,
  };
  if (options.isGroup !== undefined) body.wa_isGroup = options.isGroup;
  if (options.search) body.wa_contactName = `~${options.search}`;
  if (options.archived) body.wa_archived = true;
  if (options.pinned) body.wa_pinned = true;
  if (options.unreadOnly) body.wa_unreadCount = { $gt: 0 };

  const r = await uazapiRequest(serverUrl, token, "POST", "/chat/find", body);
  if (!r.ok) return { success: false, error: r.error };
  const chats = r.data?.chats ?? r.data ?? [];
  return { success: true, chats, total: r.data?.pagination?.total };
}

export async function getUazapiMessages(
  serverUrl: string,
  token: string,
  chatId: string,
  options: {
    limit?: number;
    offset?: number;
    search?: string;
    starred?: boolean;
    fromMe?: boolean;
    messageType?: string;
    afterTimestamp?: number;
  } = {}
): Promise<{ success: boolean; messages?: UazapiMessage[]; total?: number; error?: string }> {
  const body: Record<string, unknown> = {
    chatid: chatId,
    limit: options.limit ?? 100,
    offset: options.offset ?? 0,
  };
  if (options.search) body.text = `~${options.search}`;
  if (options.starred) body.isStarred = true;
  if (options.fromMe !== undefined) body.fromMe = options.fromMe;
  if (options.messageType) body.messageType = options.messageType;
  if (options.afterTimestamp) body.messageTimestamp = { $gt: options.afterTimestamp };

  const r = await uazapiRequest(serverUrl, token, "POST", "/message/find", body);
  if (!r.ok) return { success: false, error: r.error };
  const messages = r.data?.messages ?? r.data ?? [];
  return { success: true, messages, total: r.data?.pagination?.total };
}

export async function getStarredMessages(
  serverUrl: string,
  token: string,
  chatId?: string,
  limit = 100
): Promise<{ success: boolean; messages?: UazapiMessage[]; error?: string }> {
  const body: Record<string, unknown> = { isStarred: true, limit };
  if (chatId) body.chatid = chatId;
  const r = await uazapiRequest(serverUrl, token, "POST", "/message/find", body);
  if (!r.ok) return { success: false, error: r.error };
  return { success: true, messages: r.data?.messages ?? r.data ?? [] };
}

export async function getMediaMessages(
  serverUrl: string,
  token: string,
  chatId: string,
  type?: "image" | "video" | "audio" | "document" | "sticker",
  limit = 50
): Promise<{ success: boolean; messages?: UazapiMessage[]; error?: string }> {
  const body: Record<string, unknown> = { chatid: chatId, limit };
  if (type) {
    body.messageType = type;
  } else {
    // All media types
    body.messageType = { $in: ["image", "video", "audio", "ptt", "document", "sticker"] };
  }
  const r = await uazapiRequest(serverUrl, token, "POST", "/message/find", body);
  if (!r.ok) return { success: false, error: r.error };
  return { success: true, messages: r.data?.messages ?? r.data ?? [] };
}

export async function getUazapiChatDetails(
  serverUrl: string,
  token: string,
  number: string
): Promise<{
  success: boolean;
  image?: string;
  name?: string;
  about?: string;
  phone?: string;
  error?: string;
}> {
  const r = await uazapiRequest(serverUrl, token, "POST", "/chat/details", {
    number: number.replace(/\D/g, ""),
    preview: true,
  });
  if (!r.ok) return { success: false, error: r.error };
  return {
    success: true,
    image: r.data?.imagePreview ?? r.data?.image,
    name: r.data?.wa_contactName ?? r.data?.pushname,
    about: r.data?.status,
    phone: r.data?.phone,
  };
}

export async function getUazapiContacts(serverUrl: string, token: string, limit = 500, offset = 0) {
  const r = await uazapiRequest(serverUrl, token, "POST", "/contact/find", { limit, offset });
  if (!r.ok) return { success: false, error: r.error };
  return {
    success: true,
    contacts: r.data?.contacts ?? r.data ?? [],
    total: r.data?.pagination?.total,
  };
}

// ─── Media download ───

export async function downloadMedia(serverUrl: string, token: string, messageId: string) {
  const r = await uazapiRequest(serverUrl, token, "POST", "/message/download", {
    messageid: messageId,
  });
  if (!r.ok) return { success: false, error: r.error };
  return {
    success: true,
    base64: r.data?.base64 ?? r.data?.file,
    mimetype: r.data?.mimetype,
    url: r.data?.url,
  };
}

// ─── Group management ───

export async function getGroupParticipants(serverUrl: string, token: string, groupId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/group/participants", { groupid: groupId });
}

export async function getGroupInfo(serverUrl: string, token: string, groupId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/group/info", { groupid: groupId });
}

export async function createGroup(
  serverUrl: string,
  token: string,
  name: string,
  participants: string[]
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/create", {
    name,
    participants: participants.map((p) => p.replace(/\D/g, "")),
  });
}

export async function updateGroupSubject(
  serverUrl: string,
  token: string,
  groupId: string,
  subject: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/subject", { groupid: groupId, subject });
}

export async function updateGroupDescription(
  serverUrl: string,
  token: string,
  groupId: string,
  description: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/description", {
    groupid: groupId,
    description,
  });
}

export async function updateGroupPicture(
  serverUrl: string,
  token: string,
  groupId: string,
  imageUrl: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/pic", {
    groupid: groupId,
    file: imageUrl,
  });
}

export async function addGroupParticipant(
  serverUrl: string,
  token: string,
  groupId: string,
  number: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/add", {
    groupid: groupId,
    number: number.replace(/\D/g, ""),
  });
}

export async function removeGroupParticipant(
  serverUrl: string,
  token: string,
  groupId: string,
  number: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/remove", {
    groupid: groupId,
    number: number.replace(/\D/g, ""),
  });
}

export async function promoteGroupParticipant(
  serverUrl: string,
  token: string,
  groupId: string,
  number: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/promote", {
    groupid: groupId,
    number: number.replace(/\D/g, ""),
  });
}

export async function demoteGroupParticipant(
  serverUrl: string,
  token: string,
  groupId: string,
  number: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/demote", {
    groupid: groupId,
    number: number.replace(/\D/g, ""),
  });
}

export async function leaveGroup(serverUrl: string, token: string, groupId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/group/leave", { groupid: groupId });
}

export async function getGroupInviteLink(serverUrl: string, token: string, groupId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/group/invite-link", { groupid: groupId });
}

export async function revokeGroupInviteLink(serverUrl: string, token: string, groupId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/group/revoke-invite", { groupid: groupId });
}

export async function setGroupSettings(
  serverUrl: string,
  token: string,
  groupId: string,
  settings: { announce?: boolean; restrict?: boolean }
) {
  return uazapiRequest(serverUrl, token, "POST", "/group/settings", {
    groupid: groupId,
    ...settings,
  });
}

// ─── Labels/Tags ───

export async function getLabels(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "GET", "/label/all");
}

export async function addLabelToChat(
  serverUrl: string,
  token: string,
  chatId: string,
  labelId: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/label/add", {
    chatid: chatId,
    labelid: labelId,
  });
}

export async function removeLabelFromChat(
  serverUrl: string,
  token: string,
  chatId: string,
  labelId: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/label/remove", {
    chatid: chatId,
    labelid: labelId,
  });
}

// ─── Newsletter/Channel ───

export async function getNewsletters(serverUrl: string, token: string) {
  return uazapiRequest(serverUrl, token, "GET", "/newsletter/all");
}

// ─── Status/Stories ───

export async function postTextStatus(
  serverUrl: string,
  token: string,
  text: string,
  backgroundColor?: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/status/text", {
    text,
    backgroundColor: backgroundColor ?? "#075E54",
  });
}

export async function postImageStatus(
  serverUrl: string,
  token: string,
  imageUrl: string,
  caption?: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/status/media", {
    type: "image",
    file: imageUrl,
    caption: caption ?? "",
  });
}

export async function postVideoStatus(
  serverUrl: string,
  token: string,
  videoUrl: string,
  caption?: string
) {
  return uazapiRequest(serverUrl, token, "POST", "/status/media", {
    type: "video",
    file: videoUrl,
    caption: caption ?? "",
  });
}

// ─── Calls ───

export async function rejectCall(serverUrl: string, token: string, callId: string) {
  return uazapiRequest(serverUrl, token, "POST", "/call/reject", { callid: callId });
}

// ─── Legacy exports (backward compat) ───

export const sendUazapiMessage = sendUazapiText;
