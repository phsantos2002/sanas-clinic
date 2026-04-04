import { NextResponse } from "next/server";

/**
 * Public test endpoint to verify webhook is reachable.
 * GET /api/webhook/evolution/test
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook endpoint is reachable",
    time: new Date().toISOString(),
  });
}

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "POST received",
    time: new Date().toISOString(),
  });
}
