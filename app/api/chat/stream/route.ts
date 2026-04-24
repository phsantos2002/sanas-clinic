import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/chat/stream?chatid=<wa_chatid>&afterTs=<ms>
 *
 * Server-Sent Events stream for an open conversation. Replaces the 1s
 * client-side polling loop: the client opens one long-lived connection,
 * and this endpoint polls the DB internally at 500ms, pushing each
 * newly-persisted message down the pipe. Connection closes itself after
 * ~50s so we stay comfortably inside the Vercel serverless 60s timeout;
 * the client then reconnects with the advanced cursor and continues.
 *
 * Only 1:1 chats are streamed (groups have no Lead → no DB source). Group
 * polling stays on the existing Uazapi path.
 */

const STREAM_DURATION_MS = 50_000;
const TICK_INTERVAL_MS = 500;
const KEEPALIVE_INTERVAL_MS = 15_000;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const chatid = searchParams.get("chatid") ?? "";
  const afterTsRaw = searchParams.get("afterTs");
  const phoneOnly = chatid.split("@")[0];

  if (!phoneOnly) {
    return new Response("missing chatid", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return new Response("unauthorized", { status: 401 });
  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) return new Response("unauthorized", { status: 401 });

  const lead = await prisma.lead.findFirst({
    where: { userId: dbUser.id, phone: phoneOnly },
    select: { id: true },
  });
  if (!lead) {
    // No Lead → nothing to stream from DB. 404 so the client knows to fall
    // back to polling against Uazapi.
    return new Response("no-lead", { status: 404 });
  }
  const leadId = lead.id;

  let cursor = afterTsRaw ? new Date(parseInt(afterTsRaw, 10)) : new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          /* controller closed */
        }
      };

      // Initial handshake — lets the client know it's connected and which
      // cursor the server adopted (useful if the client sent afterTs=0).
      send("hello", { cursor: cursor.getTime() });

      const chatidCanonical = `${phoneOnly}@s.whatsapp.net`;
      let closed = false;
      const startedAt = Date.now();

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        } catch {
          closed = true;
        }
      }, KEEPALIVE_INTERVAL_MS);

      const poll = async () => {
        if (closed) return;
        try {
          const rows = await prisma.message.findMany({
            where: { leadId, createdAt: { gt: cursor } },
            orderBy: { createdAt: "asc" },
            take: 25,
            select: {
              id: true,
              role: true,
              content: true,
              externalId: true,
              createdAt: true,
            },
          });
          if (rows.length > 0) {
            const messages = rows.map((m) => ({
              id: m.id,
              messageid: m.externalId ?? m.id,
              text: m.content,
              fromMe: m.role === "assistant",
              messageTimestamp: m.createdAt.getTime(),
              messageType: "Conversation",
              sender: m.role === "assistant" ? "" : chatidCanonical,
              senderName: "",
              chatid: chatidCanonical,
              ack: m.role === "assistant" ? 3 : undefined,
            }));
            cursor = rows[rows.length - 1].createdAt;
            send("messages", { messages, cursor: cursor.getTime() });
          }
        } catch {
          /* DB blip — next tick retries */
        }

        if (Date.now() - startedAt >= STREAM_DURATION_MS) {
          closed = true;
          send("reconnect", { cursor: cursor.getTime() });
          clearInterval(keepAlive);
          clearInterval(tick);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      };

      const tick = setInterval(poll, TICK_INTERVAL_MS);

      // Client disconnect cleans everything up.
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(keepAlive);
        clearInterval(tick);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
