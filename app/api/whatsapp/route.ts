import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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
    serverUrl: config.uazapiServerUrl.trim().replace(/\/+$/, ""),
    token: config.uazapiInstanceToken.trim(),
  };
}

async function uazapi(
  serverUrl: string,
  token: string,
  method: string,
  path: string,
  body?: unknown
) {
  const headers: Record<string, string> = { token: token.trim() };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${serverUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json().catch(() => ({}));
}

export async function GET(req: NextRequest) {
  const config = await getUazapiConfig();
  if (!config) return NextResponse.json({ error: "Nao configurado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "chats": {
        const isGroup = searchParams.get("type") === "groups";
        const limit = parseInt(searchParams.get("limit") ?? "200");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const search = searchParams.get("search") ?? "";
        const archived = searchParams.get("archived") === "true";
        const pinned = searchParams.get("pinned") === "true";
        const unread = searchParams.get("unread") === "true";

        const body: Record<string, unknown> = {
          wa_isGroup: isGroup,
          sort: "-wa_lastMsgTimestamp",
          limit,
          offset,
        };
        if (search) body.wa_contactName = `~${search}`;
        if (archived) body.wa_archived = true;
        if (pinned) body.wa_pinned = true;
        if (unread) body.wa_unreadCount = { $gt: 0 };

        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/find", body);
        const chats = data.chats ?? data ?? [];

        // Enrich first 20 chats with profile pics in parallel
        const toEnrich = chats
          .slice(0, 20)
          .filter((c: Record<string, unknown>) => !c.imagePreview && c.wa_chatid);
        await Promise.allSettled(
          toEnrich.map(async (chat: Record<string, unknown>) => {
            const phone = (chat.wa_chatid as string).split("@")[0];
            try {
              const detail = await uazapi(config.serverUrl, config.token, "POST", "/chat/details", {
                number: phone,
                preview: true,
              });
              chat.imagePreview = detail.imagePreview || "";
              chat.image = detail.image || "";
            } catch {
              /* skip */
            }
          })
        );

        return NextResponse.json({ chats, total: data.pagination?.total ?? chats.length });
      }

      case "messages": {
        const chatid = searchParams.get("chatid") ?? "";
        const limit = parseInt(searchParams.get("limit") ?? "100");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const search = searchParams.get("search") ?? "";
        const starred = searchParams.get("starred") === "true";
        const afterTs = searchParams.get("afterTs");

        const body: Record<string, unknown> = { chatid, limit, offset };
        if (search) body.text = `~${search}`;
        if (starred) body.isStarred = true;
        if (afterTs) body.messageTimestamp = { $gt: parseInt(afterTs) };

        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/find", body);
        const messages = data.messages ?? data ?? [];

        return NextResponse.json({
          messages,
          total: data.pagination?.total ?? messages.length,
        });
      }

      case "starred-messages": {
        const chatid = searchParams.get("chatid");
        const limit = parseInt(searchParams.get("limit") ?? "100");
        const body: Record<string, unknown> = { isStarred: true, limit };
        if (chatid) body.chatid = chatid;
        const data = await uazapi(config.serverUrl, config.token, "POST", "/message/find", body);
        return NextResponse.json({ messages: data.messages ?? data ?? [] });
      }

      case "media-messages": {
        const chatid = searchParams.get("chatid") ?? "";
        const mediaType = searchParams.get("mediaType");
        const limit = parseInt(searchParams.get("limit") ?? "50");
        const body: Record<string, unknown> = { chatid, limit };
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
      case "pin-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/pin", {
          chatid: body.chatid,
          pin: body.pin ?? true,
        });
        return NextResponse.json({ success: true, data });
      }

      case "archive-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/archive", {
          chatid: body.chatid,
          archive: body.archive ?? true,
        });
        return NextResponse.json({ success: true, data });
      }

      case "mute-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/mute", {
          chatid: body.chatid,
          mute: body.mute ?? true,
          duration: body.duration ?? 28800,
        });
        return NextResponse.json({ success: true, data });
      }

      case "clear-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/clear", {
          chatid: body.chatid,
        });
        return NextResponse.json({ success: true, data });
      }

      case "delete-chat": {
        const data = await uazapi(config.serverUrl, config.token, "POST", "/chat/delete", {
          chatid: body.chatid,
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
