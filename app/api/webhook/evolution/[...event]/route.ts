import { NextRequest } from "next/server";
import { POST as evolutionPOST } from "../route";

/**
 * Catch-all fallback for Uazapi webhooks with addUrlEvents=true.
 *
 * When Uazapi is configured with addUrlEvents=true, it appends the event
 * type to the configured URL, e.g.:
 *   /api/webhook/evolution/messages
 *   /api/webhook/evolution/connection
 *   /api/webhook/evolution/message_ack
 *   /api/webhook/evolution/group_update
 *   /api/webhook/evolution/call
 *
 * Next.js treats these as different routes — without this catch-all they'd
 * return 404 and the upstream would think we rejected the delivery.
 *
 * We ignore the path segment and forward the full request to the main
 * /api/webhook/evolution handler, which detects the event type from the
 * payload itself (EventType field or inferred from `message` presence).
 */
export async function POST(req: NextRequest) {
  return evolutionPOST(req);
}

export async function GET() {
  // Some providers probe with GET — return 200 so they don't disable the hook
  return new Response(JSON.stringify({ ok: true, note: "catch-all webhook" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
