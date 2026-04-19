import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/whatsapp/send
 *
 * Supports ALL message types:
 * { number, text, quotedMsgId? }                             — text
 * { number, type: "image", file, caption? }                  — image
 * { number, type: "video", file, caption? }                  — video
 * { number, type: "document", file, fileName }               — document
 * { number, type: "audio", file }                            — PTT audio
 * { number, type: "sticker", file }                          — sticker
 * { number, type: "location", lat, lng, name?, address? }    — location
 * { number, type: "contact", contactName, contactPhone }     — vcard
 * { number, type: "poll", question, options[] }              — poll
 * { numbers[], text, type: "bulk", delay? }                  — bulk text send
 */

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (
    !config ||
    config.provider !== "uazapi" ||
    !config.uazapiServerUrl ||
    !config.uazapiInstanceToken
  ) {
    return NextResponse.json({ error: "Uazapi nao configurado" }, { status: 400 });
  }

  const body = await req.json();
  const {
    number,
    numbers,
    type,
    text,
    file,
    caption,
    fileName,
    quotedMsgId,
    lat,
    lng,
    name,
    address,
    contactName,
    contactPhone,
    question,
    options,
    delay,
  } = body;

  // Bulk send
  if (type === "bulk" && Array.isArray(numbers)) {
    if (!text) return NextResponse.json({ error: "text obrigatorio para bulk" }, { status: 400 });
    const { uazapiServerUrl: serverUrl, uazapiInstanceToken: token } = config;
    const res = await fetch(`${serverUrl}/send/bulk/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: token! },
      body: JSON.stringify({
        numbers: numbers.map((n: string) => n.replace(/\D/g, "")),
        text,
        delay: delay ?? 3,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ success: res.ok, data });
  }

  if (!number) {
    return NextResponse.json({ error: "number obrigatorio" }, { status: 400 });
  }

  const phone = number.replace(/\D/g, "");
  const { uazapiServerUrl: serverUrl, uazapiInstanceToken: token } = config;

  try {
    let endpoint: string;
    let payload: Record<string, unknown>;

    switch (type) {
      case "image":
      case "video":
      case "document":
      case "audio":
      case "sticker": {
        if (!file) return NextResponse.json({ error: "file obrigatorio" }, { status: 400 });
        endpoint = "/send/media";
        payload = {
          number: phone,
          type: type === "audio" ? "ptt" : type,
          file,
          caption: caption || "",
        };
        if (type === "document" && fileName) payload.fileName = fileName;
        break;
      }

      case "location": {
        if (!lat || !lng)
          return NextResponse.json({ error: "lat e lng obrigatorios" }, { status: 400 });
        endpoint = "/send/location";
        payload = { number: phone, lat, lng, name: name || "", address: address || "" };
        break;
      }

      case "contact": {
        if (!contactName || !contactPhone)
          return NextResponse.json(
            { error: "contactName e contactPhone obrigatorios" },
            { status: 400 }
          );
        endpoint = "/send/contact";
        payload = { number: phone, contactName, contactNumber: contactPhone.replace(/\D/g, "") };
        break;
      }

      case "poll": {
        if (!question || !Array.isArray(options))
          return NextResponse.json({ error: "question e options obrigatorios" }, { status: 400 });
        endpoint = "/send/poll";
        payload = { number: phone, question, options };
        break;
      }

      default: {
        if (!text) return NextResponse.json({ error: "text obrigatorio" }, { status: 400 });
        endpoint = "/send/text";
        payload = { number: phone, text };
        if (quotedMsgId) payload.quotedMsgId = quotedMsgId;
        break;
      }
    }

    const res = await fetch(`${serverUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: token! },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    // Save to local DB if lead exists
    const lead = await prisma.lead.findFirst({
      where: { userId: dbUser.id, phone: { endsWith: phone.slice(-9) } },
    });

    if (lead) {
      const content = text || caption || question || `[${type || "texto"}]`;
      await prisma.message.create({
        data: { leadId: lead.id, role: "assistant", content },
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { lastInteractionAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[whatsapp send]", err);
    return NextResponse.json({ error: "Erro ao enviar" }, { status: 500 });
  }
}
