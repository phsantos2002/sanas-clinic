import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/services/whatsappService";

async function findLeadsForReactivation(userId: string, inactiveDays: number) {
  const cutoff = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
  return prisma.lead.findMany({
    where: {
      userId,
      aiEnabled: true,
      lastInteractionAt: { lt: cutoff },
      OR: [
        { reactivationSentAt: null },
        { reactivationSentAt: { lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      ],
      stage: { eventName: { not: "Purchase" } },
    },
    select: { id: true, name: true, phone: true, lastInteractionAt: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
}

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  try {
    // Find all users with WhatsApp + AI config
    const configs = await prisma.whatsAppConfig.findMany({
      include: { user: { include: { aiConfig: true } } },
    });

    let totalSent = 0;

    for (const waConfig of configs) {
      const aiConfig = waConfig.user?.aiConfig;
      if (!aiConfig) continue;

      const leads = await findLeadsForReactivation(waConfig.userId, 7);
      if (leads.length === 0) continue;

      const clinicName = aiConfig.clinicName || "nossa clinica";

      for (const lead of leads) {
        // Simple reactivation message — could be AI-generated in future
        const messages = [
          `Oi ${lead.name.split(" ")[0]}! Faz um tempinho que nao conversamos. Tem alguma duvida sobre nossos servicos? Estamos aqui para ajudar! - ${clinicName}`,
          `Ola ${lead.name.split(" ")[0]}! Tudo bem? Passando pra lembrar que temos novidades especiais. Quer saber mais? - ${clinicName}`,
          `${lead.name.split(" ")[0]}, sentimos sua falta! Temos condicoes especiais essa semana. Posso te contar? - ${clinicName}`,
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];

        try {
          const result = await sendMessage(waConfig, lead.phone, message);
          if (result.success) {
            // Save message and mark reactivation
            await prisma.$transaction([
              prisma.message.create({
                data: { leadId: lead.id, role: "assistant", content: message },
              }),
              prisma.lead.update({
                where: { id: lead.id },
                data: {
                  reactivationSentAt: new Date(),
                  lastInteractionAt: new Date(),
                },
              }),
            ]);
            totalSent++;
          }
        } catch {
          // Non-critical, continue with next lead
        }
      }
    }

    logger.info("cron_reactivate_leads_done", { sent: totalSent });
    return NextResponse.json({ ok: true, sent: totalSent });
  } catch (error) {
    logger.error("cron_reactivate_leads_failed", {}, error);
    return NextResponse.json({ error: "Erro na reativacao" }, { status: 500 });
  }
}
