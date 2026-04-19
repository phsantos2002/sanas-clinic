import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/leads
 * API pública para capturar leads de landing pages com rastreamento UTM.
 *
 * Auth: header x-api-key deve corresponder ao accessToken do Pixel do usuário.
 * Body: { userId, name, phone, source?, medium?, campaign?, adName?, platform?, referrer? }
 *
 * CORREÇÕES DE SEGURANÇA (Sprint 1):
 * - Validação explícita pixel.userId === userId (previne leads em contas alheias)
 * - Deduplicação por telefone normalizado completo (não mais suffix de 9 dígitos)
 * - Criação de lead + histórico em transação atômica
 */
export async function POST(req: NextRequest) {
  const log = logger.child({ route: "POST /api/leads" });

  // Rate limit: 120 lead captures per minute per IP (protects against spam submissions)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`leads:${ip}`, { maxRequests: 120, windowMs: 60_000 });
  if (!rl.allowed) {
    log.warn("leads_rate_limited", { ip });
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  try {
    const body = await req.json();
    const {
      userId,
      name,
      phone,
      source,
      medium,
      campaign,
      adSetName,
      adName,
      adAccountName,
      platform,
      referrer,
    } = body;

    // ── Validação de campos obrigatórios ──────────────────────────────────
    if (!userId || !name || !phone) {
      throw new ValidationError("userId, name e phone são obrigatórios");
    }

    // ── Validação de telefone ─────────────────────────────────────────────
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      throw new ValidationError("Número de telefone inválido (deve ter 10-15 dígitos)");
    }

    // ── Autenticação via x-api-key ────────────────────────────────────────
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 });
    }

    // CORREÇÃO CRÍTICA: pixel.userId deve bater com userId do body
    const pixel = await prisma.pixel.findUnique({ where: { userId } });
    if (!pixel || pixel.accessToken !== apiKey || pixel.userId !== userId) {
      log.warn("leads_api_invalid_key", { userId });
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    // ── Deduplicação por telefone normalizado completo ────────────────────
    const existing = await prisma.lead.findFirst({
      where: { userId, phone: cleanPhone },
    });

    if (existing) {
      if (!existing.source && source) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: { source, medium, campaign, adSetName, adName, adAccountName, platform, referrer },
        });
      }
      log.info("leads_api_duplicate", { leadId: existing.id });
      return NextResponse.json({ id: existing.id, created: false });
    }

    // ── Criar lead + histórico de stage em transação ──────────────────────
    const firstStage = await prisma.stage.findFirst({
      where: { userId },
      orderBy: { order: "asc" },
    });

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          name,
          phone: cleanPhone,
          userId,
          stageId: firstStage?.id ?? null,
          source: source ?? null,
          medium: medium ?? null,
          campaign: campaign ?? null,
          adSetName: adSetName ?? null,
          adName: adName ?? null,
          adAccountName: adAccountName ?? null,
          platform: platform ?? null,
          referrer: referrer ?? null,
          lastInteractionAt: new Date(),
        },
      });

      if (firstStage) {
        await tx.leadStageHistory.create({
          data: { leadId: created.id, stageId: firstStage.id },
        });
      }

      return created;
    });

    log.info("leads_api_created", { leadId: lead.id, source, platform });
    return NextResponse.json({ id: lead.id, created: true }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    log.error("leads_api_error", {}, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
