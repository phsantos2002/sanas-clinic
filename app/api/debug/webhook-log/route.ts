import { NextRequest, NextResponse } from "next/server";

import { validateCronAuth } from "@/lib/validateCronAuth";

/**
 * In-memory webhook log para debugging.
 * CORREÇÃO SEGURANÇA (Sprint 1): rota agora protegida com CRON_SECRET.
 *
 * GET    /api/debug/webhook-log — Visualiza últimos 20 payloads
 * POST   /api/debug/webhook-log — Armazena payload (chamado internamente)
 * DELETE /api/debug/webhook-log — Limpa logs
 */

const webhookLogs: { time: string; payload: unknown }[] = [];
const MAX_LOGS = 20;

export function logWebhook(payload: unknown) {
  webhookLogs.unshift({ time: new Date().toISOString(), payload });
  if (webhookLogs.length > MAX_LOGS) webhookLogs.length = MAX_LOGS;
}

export async function GET(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;
  return NextResponse.json({ count: webhookLogs.length, logs: webhookLogs });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body) logWebhook(body);
  return NextResponse.json({ ok: true, count: webhookLogs.length });
}

export async function DELETE(req: NextRequest) {
  const deny = validateCronAuth(req);
  if (deny) return deny;
  webhookLogs.length = 0;
  return NextResponse.json({ ok: true, cleared: true });
}
