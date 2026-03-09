import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendWhatsAppMessage, sendWhatsAppAudio } from "@/services/evolutionApi";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";
import { generateAudio } from "@/services/textToSpeech";

// Evolution API webhook payload
type EvolutionPayload = {
  event: string;
  instance: string;
  data: {
    key: { remoteJid: string; fromMe: boolean; id: string };
    message?: { conversation?: string; extendedTextMessage?: { text: string } };
    pushName?: string;
  };
};

function extractText(payload: EvolutionPayload): string | null {
  const msg = payload.data.message;
  if (!msg) return null;
  return msg.conversation ?? msg.extendedTextMessage?.text ?? null;
}

function normalizePhone(jid: string): string {
  // "5511999999999@s.whatsapp.net" → "5511999999999"
  return jid.replace(/@.*$/, "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EvolutionPayload;

    // Only process incoming text messages
    if (body.event !== "messages.upsert" || body.data.key.fromMe) {
      return NextResponse.json({ ok: true });
    }

    const text = extractText(body);
    if (!text?.trim()) return NextResponse.json({ ok: true });

    const phone = normalizePhone(body.data.key.remoteJid);
    const pushName = body.data.pushName ?? "";

    // Find lead by phone (match last 9 digits to be flexible)
    const phoneSuffix = phone.slice(-9);
    const lead = await prisma.lead.findFirst({
      where: { phone: { endsWith: phoneSuffix } },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        stage: true,
        user: true,
      },
    });

    if (!lead) return NextResponse.json({ ok: true });

    // Save incoming message
    await prisma.message.create({
      data: { leadId: lead.id, role: "user", content: text.trim() },
    });

    if (!lead.aiEnabled) return NextResponse.json({ ok: true });

    // Load AI config for this user
    const aiConfig = await getAIConfigByUserId(lead.userId);

    // Build conversation history for AI
    const history = [
      ...lead.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: text.trim() },
    ];

    const { reply, newStageEventName } = await generateAIReply(
      history,
      lead.name || pushName,
      {
        clinicName: aiConfig?.clinicName ?? undefined,
        systemPrompt: aiConfig?.systemPrompt ?? undefined,
      }
    );

    // Save AI reply
    await prisma.message.create({
      data: { leadId: lead.id, role: "assistant", content: reply },
    });

    // Send text reply on WhatsApp
    await sendWhatsAppMessage(phone, reply);

    // Send audio if configured
    if (aiConfig?.sendAudio && aiConfig.openaiKey) {
      const audioBuffer = await generateAudio(reply, aiConfig.openaiKey);
      if (audioBuffer) {
        await sendWhatsAppAudio(phone, audioBuffer);
      }
    }

    // Update stage if AI determined a new one
    if (newStageEventName && newStageEventName !== lead.stage?.eventName) {
      const newStage = await prisma.stage.findFirst({
        where: { userId: lead.userId, eventName: newStageEventName },
      });

      if (newStage) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { stageId: newStage.id },
        });
        await prisma.leadStageHistory.create({
          data: { leadId: lead.id, stageId: newStage.id },
        });
        await sendFacebookEvent({
          userId: lead.userId,
          phone: lead.phone,
          eventName: newStage.eventName,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
