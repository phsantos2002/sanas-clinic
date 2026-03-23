import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Proxy API for Uazapi — used by Chat UI to fetch chats, messages, and details in real time.
 *
 * GET /api/whatsapp?action=chats&limit=50&offset=0
 * GET /api/whatsapp?action=chats&type=groups&limit=50
 * GET /api/whatsapp?action=messages&chatid=5511999999999@s.whatsapp.net&limit=30
 * GET /api/whatsapp?action=details&number=5511999999999
 * GET /api/whatsapp?action=status
 */

async function getUazapiConfig() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return null;

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (!config || config.provider !== "uazapi" || !config.uazapiServerUrl || !config.uazapiInstanceToken) {
    return null;
  }

  return { serverUrl: config.uazapiServerUrl, token: config.uazapiInstanceToken };
}

export async function GET(req: NextRequest) {
  const config = await getUazapiConfig();
  if (!config) {
    return NextResponse.json({ error: "Não configurado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "chats": {
        const isGroup = searchParams.get("type") === "groups";
        const limit = parseInt(searchParams.get("limit") ?? "50");
        const offset = parseInt(searchParams.get("offset") ?? "0");
        const search = searchParams.get("search") ?? "";

        const body: Record<string, unknown> = {
          wa_isGroup: isGroup,
          sort: "-wa_lastMsgTimestamp",
          limit,
          offset,
        };

        if (search) {
          body.wa_contactName = `~${search}`;
        }

        const res = await fetch(`${config.serverUrl}/chat/find`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: config.token },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        const chats = data.chats ?? data ?? [];

        // Fetch profile pics for first 20 chats that don't have one
        const enriched = await Promise.all(
          chats.slice(0, 50).map(async (chat: Record<string, unknown>) => {
            if (!chat.imagePreview && chat.wa_chatid) {
              const phone = (chat.wa_chatid as string).split("@")[0];
              try {
                const detailRes = await fetch(`${config.serverUrl}/chat/details`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", token: config.token },
                  body: JSON.stringify({ number: phone, preview: true }),
                });
                const detail = await detailRes.json();
                chat.imagePreview = detail.imagePreview || "";
                chat.image = detail.image || "";
              } catch {
                // ignore
              }
            }
            return chat;
          })
        );

        return NextResponse.json({ chats: enriched });
      }

      case "messages": {
        const chatid = searchParams.get("chatid") ?? "";
        const limit = parseInt(searchParams.get("limit") ?? "30");
        const offset = parseInt(searchParams.get("offset") ?? "0");

        const res = await fetch(`${config.serverUrl}/message/find`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: config.token },
          body: JSON.stringify({ chatid, limit, offset }),
        });

        const data = await res.json();
        return NextResponse.json(data);
      }

      case "details": {
        const number = searchParams.get("number") ?? "";
        const res = await fetch(`${config.serverUrl}/chat/details`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token: config.token },
          body: JSON.stringify({ number, preview: true }),
        });

        const data = await res.json();
        return NextResponse.json(data);
      }

      case "status": {
        const res = await fetch(`${config.serverUrl}/instance/status`, {
          method: "GET",
          headers: { token: config.token },
        });

        const data = await res.json();
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (err) {
    console.error("[whatsapp proxy]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
