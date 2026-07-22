import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveSession } from "@/app/actions/user";
import { getSendConnection } from "@/services/connections";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

/**
 * POST /api/whatsapp/ticket-media (multipart)
 * Campos: ticketId, file, caption?
 * Faz upload no Blob e envia pela conexão do lead (Evolution). Persiste a
 * mensagem com mediaUrl/mediaType.
 */
export async function POST(req: NextRequest) {
  const ctx = await resolveSession();
  if (!ctx) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const rl = rateLimit(`ticket-media:${ctx.authUserId}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisicoes" }, { status: 429 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Storage nao configurado (BLOB_READ_WRITE_TOKEN)" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const ticketId = form.get("ticketId") as string | null;
  const file = form.get("file") as File | null;
  const caption = (form.get("caption") as string | null)?.trim() || "";

  if (!ticketId || !file) {
    return NextResponse.json({ error: "ticketId e file obrigatorios" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande (max 50MB)" }, { status: 400 });
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId: ctx.tenantId },
    include: { lead: true },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket nao encontrado" }, { status: 404 });

  // Escopo: vendedor só envia em ticket próprio
  const { isRestrictedRole } = await import("@/lib/session");
  if (isRestrictedRole(ctx.role) && ticket.attendantId !== ctx.attendantId) {
    return NextResponse.json({ error: "Sem permissao neste atendimento" }, { status: 403 });
  }

  // Tipo de mídia a partir do mime
  const mime = file.type || "";
  const mediaType: "image" | "video" | "audio" | "document" = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
        ? "audio"
        : "document";

  // Upload
  let url: string;
  try {
    const ext = file.name.split(".").pop() || "bin";
    const blob = await put(`tickets/${ctx.tenantId}/${Date.now()}.${ext}`, file, {
      access: "public",
    });
    url = blob.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    return NextResponse.json({ error: `Falha no upload: ${msg}` }, { status: 500 });
  }

  // Resolve conexão e envia
  const send = await getSendConnection(ticket.lead);
  if (!send) return NextResponse.json({ error: "Nenhuma conexao disponivel" }, { status: 400 });

  if (send.config.provider !== "evolution") {
    return NextResponse.json(
      { error: "Envio de midia disponivel apenas em conexoes Evolution por enquanto" },
      { status: 501 }
    );
  }

  const { sendEvolutionMedia, sendEvolutionAudio } = await import("@/services/whatsappEvolution");
  const serverUrl = send.config.uazapiServerUrl!;
  const token = send.config.uazapiInstanceToken!;
  const instance = send.config.uazapiInstanceName!;

  const result =
    mediaType === "audio"
      ? await sendEvolutionAudio(serverUrl, token, instance, ticket.lead.phone, url)
      : await sendEvolutionMedia(serverUrl, token, instance, ticket.lead.phone, {
          mediatype: mediaType,
          url,
          caption,
          fileName: file.name,
        });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Falha no envio" }, { status: 502 });
  }

  // Persiste + estampa TME
  const { stampHumanReply } = await import("@/services/ticketService");
  await stampHumanReply({ leadId: ticket.leadId, attendantId: ctx.attendantId }).catch(() => null);

  await prisma.message.create({
    data: {
      leadId: ticket.leadId,
      role: "assistant",
      content: caption,
      mediaUrl: url,
      mediaType,
      ticketId: ticket.id,
      attendantId: ctx.attendantId,
      connectionId: send.connectionId,
    },
  });

  return NextResponse.json({ success: true, url, mediaType });
}
