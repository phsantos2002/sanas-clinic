/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window counter per IP/key.
 *
 * Note: In-memory only — resets on redeploy. For production at scale,
 * use Vercel KV or Upstash Redis. This is sufficient for MVP protection.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key);
  }
}

export function rateLimit(
  key: string,
  opts: { maxRequests: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.maxRequests - 1, resetAt: now + opts.windowMs };
  }

  entry.count++;
  const allowed = entry.count <= opts.maxRequests;
  return {
    allowed,
    remaining: Math.max(0, opts.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit presets for different route types.
 */
export const RATE_LIMITS = {
  api: { maxRequests: 60, windowMs: 60_000 },       // 60 req/min for general API
  webhook: { maxRequests: 300, windowMs: 60_000 },   // 300 req/min for webhooks
  ai: { maxRequests: 20, windowMs: 60_000 },          // 20 req/min for AI generation
  upload: { maxRequests: 30, windowMs: 60_000 },       // 30 req/min for uploads
} as const;
