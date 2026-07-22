import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { validateCronAuth } from "@/lib/validateCronAuth";
import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/services/whatsappService";
import { getSendConnection } from "@/services/connections";

/**
 * GET /api/cron/birthdays — envia mensagem de aniversário (cron diário).
 * Só dispara para tenants com AIConfig.birthdayMessage preenchida.
 */
export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;

  const log = logger.child({ cron: "birthdays" });
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Tenants com template configurado
  const configs = await prisma.aIConfig.findMany({
    where: { birthdayMessage: { not: null } },
    select: { userId: true, birthdayMessage: true },
  });

  let sent = 0;
  for (const config of configs) {
    // Aniversariantes do dia (compara mês/dia via SQL)
    const leads = await prisma.$queryRaw<
      { id: string; name: string; phone: string; connectionId: string | null; assignedTo: string | null; userId: string }[]
    >`
      SELECT "id", "name", "phone", "connectionId", "assignedTo", "userId"
      FROM "Lead"
      WHERE "userId" = ${config.userId}
        AND "birthday" IS NOT NULL
        AND EXTRACT(MONTH FROM "birthday") = ${month}
        AND EXTRACT(DAY FROM "birthday") = ${day}
      LIMIT 100
    `;

    for (const lead of leads) {
      try {
        const send = await getSendConnection(lead);
        if (!send) continue;

        const text = (config.birthdayMessage ?? "").replace(
          /\{\{nome\}\}/gi,
          lead.name.split(" ")[0]
        );
        const result = await sendMessage(send.config, lead.phone, text);
        if (result.success) {
          await prisma.message.create({
            data: {
              leadId: lead.id,
              role: "assistant",
              content: text,
              connectionId: send.connectionId,
            },
          });
          sent++;
        }
      } catch (err) {
        log.error("birthday_send_failed", { leadId: lead.id, err });
      }
    }
  }

  log.info("birthdays_done", { tenants: configs.length, sent });
  return NextResponse.json({ ok: true, sent });
}
