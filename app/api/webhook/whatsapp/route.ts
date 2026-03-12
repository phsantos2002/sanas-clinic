import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIReply } from "@/services/aiChat";
import { sendWhatsAppMessage } from "@/services/whatsappCloud";
import { sendFacebookEvent } from "@/services/facebookEvents";
import { getAIConfigByUserId } from "@/app/actions/aiConfig";

// Meta WhatsApp Cloud API webhook payload
type MetaEntry = {
  id: string;
  changes: {
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: {
        from: string;
        id: string;
        timestamp: string;
        type: string;
        text?: { body: string };
      }[];
    };
    field: string;
  }[];
};

type MetaPayload = {
  object: string;
  entry: MetaEntry[];
};

// GET — webhook verification by Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe") {
    // Find any user whose verifyToken matches
    const config = await prisma.whatsAppConfig.findFirst({
      where: { verifyToken: token ?? "" },
    });

    if (config) {
      return new Response(challenge, { status: 200 });
    }
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MetaPayload;

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value.metadata.phone_number_id;
        const messages = value.messages;
        if (!messages?.length) continue;

        // Find which user owns this phone number
        const whatsappConfig = await prisma.whatsAppConfig.findFirst({
          where: { phoneNumberId },
          include: { user: true },
        });
        if (!whatsappConfig) continue;

        for (const msg of messages) {
          if (msg.type !== "text" || !msg.text?.body?.trim()) continue;

          const text = msg.text.body.trim();
          const phone = msg.from;
          const pushName = value.contacts?.[0]?.profile?.name ?? "";

          // Find lead by phone or auto-create
          const phoneSuffix = phone.slice(-9);
          let lead = await prisma.lead.findFirst({
            where: {
              userId: whatsappConfig.userId,
              phone: { endsWith: phoneSuffix },
            },
            include: {
              messages: { orderBy: { createdAt: "asc" } },
              stage: true,
              user: true,
            },
          });

          if (!lead) {
            // Auto-create lead from incoming WhatsApp message
            const firstStage = await prisma.stage.findFirst({
              where: { userId: whatsappConfig.userId },
              orderBy: { order: "asc" },
            });

            const created = await prisma.lead.create({
              data: {
                name: pushName || phone,
                phone,
                userId: whatsappConfig.userId,
                stageId: firstStage?.id ?? null,
                source: "whatsapp",
                platform: "whatsapp",
                medium: "organic",
              },
              include: {
                messages: { orderBy: { createdAt: "asc" } },
                stage: true,
                user: true,
              },
            });

            if (firstStage) {
              await prisma.leadStageHistory.create({
                data: { leadId: created.id, stageId: firstStage.id },
              });
            }

            lead = created;
          }

          // Save incoming message
          await prisma.message.create({
            data: { leadId: lead.id, role: "user", content: text },
          });

          if (!lead.aiEnabled) continue;

          // Load AI config
          const aiConfig = await getAIConfigByUserId(lead.userId);

          // Build conversation history
          const history = [
            ...lead.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user" as const, content: text },
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

          // Send reply via WhatsApp Cloud API
          await sendWhatsAppMessage(
            whatsappConfig.phoneNumberId,
            whatsappConfig.accessToken,
            phone,
            reply
          );

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
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whatsapp webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
