import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/whatsapp/test-webhook
 *
 * Simulates a Uazapi webhook hit on our /api/webhook/evolution endpoint to
 * isolate whether the problem is:
 *   - Our side fails to process (DB / queue / parse) → fix our code
 *   - Our side processes OK → problem is upstream (Uazapi not delivering)
 *
 * Sends a synthetic message that includes the user's phone, mimicking the new
 * Uazapi format, then waits for the webhook handler to respond.
 *
 * Compares Message count BEFORE/AFTER to detect if the message was persisted.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (!config?.uazapiInstanceToken || !config?.uazapiInstanceName) {
    return NextResponse.json(
      { error: "Uazapi não configurado (token/instanceName ausente)" },
      { status: 400 }
    );
  }

  // Use a clearly-fake phone so we don't pollute real conversations
  const fakePhone = "5500900000000";
  const fakeMessageId = `TEST_${Date.now()}`;
  const fakeText = `[teste local diagnóstico ${new Date().toISOString()}]`;

  const fakePayload = {
    EventType: "messages",
    BaseUrl: config.uazapiServerUrl,
    instanceName: config.uazapiInstanceName,
    token: config.uazapiInstanceToken,
    chat: {
      wa_chatid: `${fakePhone}@s.whatsapp.net`,
      wa_contactName: "Teste Diagnóstico",
      wa_isGroup: false,
    },
    message: {
      id: fakeMessageId,
      messageId: fakeMessageId,
      content: fakeText,
      text: fakeText,
      fromMe: false,
      chatId: `${fakePhone}@s.whatsapp.net`,
      messageTimestamp: Math.floor(Date.now() / 1000),
      messageType: "Conversation",
      sender: `${fakePhone}@s.whatsapp.net`,
      senderName: "Teste",
      isGroup: false,
      wasSentByApi: false,
    },
  };

  const reqUrl = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || reqUrl.origin;
  const webhookEndpoint = `${origin}/api/webhook/evolution`;

  // Count messages with this externalId BEFORE
  const beforeCount = await prisma.message.count({
    where: { externalId: fakeMessageId },
  });

  let httpStatus: number | null = null;
  let httpBody: string | null = null;
  let networkError: string | null = null;
  const started = Date.now();

  try {
    const response = await fetch(webhookEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fakePayload),
    });
    httpStatus = response.status;
    httpBody = (await response.text()).slice(0, 500);
  } catch (err) {
    networkError = err instanceof Error ? err.message : String(err);
  }
  const durationMs = Date.now() - started;

  // Wait for the queue to process (queue runs async after the 200 response)
  await new Promise((r) => setTimeout(r, 3000));

  const afterCount = await prisma.message.count({
    where: { externalId: fakeMessageId },
  });

  // Also check if a Lead was created/updated
  const lead = await prisma.lead.findFirst({
    where: { userId: dbUser.id, phone: fakePhone },
    select: { id: true, name: true, createdAt: true },
  });

  return NextResponse.json({
    webhookEndpoint,
    httpStatus,
    httpBody,
    networkError,
    durationMs,
    messagePersisted: afterCount > beforeCount,
    leadCreated: !!lead,
    leadId: lead?.id ?? null,
    interpretation:
      networkError !== null
        ? `Falha de rede ao chamar nosso webhook: ${networkError}. Pode ser proteção de deployment do Vercel ou domínio inacessível.`
        : httpStatus !== 200
          ? `Webhook respondeu HTTP ${httpStatus}. Verifique logs do Vercel — handler está rejeitando ou crashando.`
          : afterCount > beforeCount
            ? "✓ Nosso webhook processou OK. Problema é externo: Uazapi não está enviando webhooks reais."
            : "Webhook respondeu 200 mas mensagem NÃO foi persistida. Algum filtro no webhookProcessor está bloqueando (whitelist/blacklist/dedup/skip).",
  });
}
