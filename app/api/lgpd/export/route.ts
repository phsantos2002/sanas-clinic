import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/lgpd/export?phone=5511999999999
 *
 * Returns ALL data the system holds about the given contact phone — for the
 * authenticated CRM owner. Includes lead profile, messages, stage history,
 * activities, pixel events, workflow executions and email tracking.
 *
 * Audit logged.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) return NextResponse.json({ error: "phone obrigatório" }, { status: 400 });

  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return NextResponse.json({ error: "phone inválido" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: { userId: dbUser.id, phone: normalized },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      stageHistory: { include: { stage: true }, orderBy: { createdAt: "asc" } },
      activities: { orderBy: { createdAt: "asc" } },
      pixelEvents: { orderBy: { createdAt: "asc" } },
      workflowExecutions: { orderBy: { startedAt: "asc" } },
      stage: true,
    },
  });

  if (!lead) {
    await logAudit({
      userId: dbUser.id,
      action: "lgpd.export",
      metadata: { phone: maskPhone(normalized), found: false },
      ipAddress: req.headers.get("x-forwarded-for") ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
    });
    return NextResponse.json({ found: false, phone: maskPhone(normalized) }, { status: 404 });
  }

  // Avatar cache and DLQ entries also reference the phone — include them
  const [avatarCache, dlqEntries, emailTracking] = await Promise.all([
    prisma.whatsAppAvatarCache.findUnique({
      where: { userId_phone: { userId: dbUser.id, phone: normalized } },
    }),
    prisma.webhookDLQ.findMany({
      where: { userId: dbUser.id, phone: { contains: maskPhone(normalized).slice(-4) } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.emailTracking.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messageCount = (lead as any).messages?.length ?? 0;
  await logAudit({
    userId: dbUser.id,
    action: "lgpd.export",
    entityType: "Lead",
    entityId: lead.id,
    metadata: {
      phone: maskPhone(normalized),
      found: true,
      messageCount,
    },
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  });

  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      lead,
      avatarCache,
      dlqEntries,
      emailTracking,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="lgpd-export-${normalized}-${Date.now()}.json"`,
      },
    }
  );
}
