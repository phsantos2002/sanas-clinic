import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory webhook log for debugging.
 * GET  /api/debug/webhook-log — View last 20 webhook payloads
 * POST /api/debug/webhook-log — Store a payload (called internally)
 * DELETE /api/debug/webhook-log — Clear logs
 */

// Global in-memory store (persists during serverless function warm period)
const webhookLogs: { time: string; payload: unknown }[] = [];
const MAX_LOGS = 20;

export function logWebhook(payload: unknown) {
  webhookLogs.unshift({ time: new Date().toISOString(), payload });
  if (webhookLogs.length > MAX_LOGS) webhookLogs.length = MAX_LOGS;
}

export async function GET() {
  return NextResponse.json({
    count: webhookLogs.length,
    logs: webhookLogs,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body) {
    logWebhook(body);
  }
  return NextResponse.json({ ok: true, count: webhookLogs.length });
}

export async function DELETE() {
  webhookLogs.length = 0;
  return NextResponse.json({ ok: true, cleared: true });
}
