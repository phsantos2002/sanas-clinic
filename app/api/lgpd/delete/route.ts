import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { logAudit } from "@/lib/audit";

/**
 * DELETE /api/lgpd/delete?phone=5511999999999&confirm=true
 *
 * Hard-deletes ALL data related to a contact phone for the authenticated CRM
 * owner. Cascades through Lead → Messages, StageHistory, Activities,
 * PixelEvents, WorkflowExecutions, EmailTracking, WACampaignMessage.
 * Also clears WhatsAppAvatarCache.
 *
 * Requires `confirm=true` query string to avoid accidental triggers.
 *
 * Audit logged BEFORE deletion (so the audit row survives).
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const phone = req.nextUrl.searchParams.get("phone");
  const confirm = req.nextUrl.searchParams.get("confirm") === "true";
  if (!phone) return NextResponse.json({ error: "phone obrigatório" }, { status: 400 });
  if (!confirm) {
    return NextResponse.json({ error: "Adicione confirm=true para prosseguir" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  if (normalized.length < 8) {
    return NextResponse.json({ error: "phone inválido" }, { status: 400 });
  }

  const lead = await prisma.lead.findFirst({
    where: { userId: dbUser.id, phone: normalized },
    select: { id: true },
  });

  if (!lead) {
    await logAudit({
      userId: dbUser.id,
      action: "lgpd.delete",
      metadata: { phone: maskPhone(normalized), found: false },
      ipAddress: req.headers.get("x-forwarded-for") ?? null,
      userAgent: req.headers.get("user-agent") ?? null,
    });
    return NextResponse.json({ deleted: false, reason: "Lead não encontrado" });
  }

  // Audit BEFORE deletion so the audit row survives even if delete cascades
  await logAudit({
    userId: dbUser.id,
    action: "lgpd.delete",
    entityType: "Lead",
    entityId: lead.id,
    metadata: { phone: maskPhone(normalized), found: true },
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  });

  // Cascade-delete (Lead has onDelete: Cascade on most children).
  await prisma.$transaction([
    prisma.lead.delete({ where: { id: lead.id } }),
    prisma.whatsAppAvatarCache.deleteMany({
      where: { userId: dbUser.id, phone: normalized },
    }),
  ]);

  return NextResponse.json({
    deleted: true,
    phone: maskPhone(normalized),
    leadId: lead.id,
  });
}
