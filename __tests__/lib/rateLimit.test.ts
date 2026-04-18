import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("permite requisições dentro do limite", () => {
    const result = rateLimit("test-key-1", { maxRequests: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("bloqueia após atingir o limite", () => {
    const key = "test-key-block-" + Date.now();
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { maxRequests: 3, windowMs: 60_000 });
    }
    const last = rateLimit(key, { maxRequests: 3, windowMs: 60_000 });
    expect(last.allowed).toBe(false);
    expect(last.remaining).toBe(0);
  });

  it("chaves diferentes são independentes", () => {
    const ts = Date.now();
    const r1 = rateLimit(`key-a-${ts}`, { maxRequests: 2, windowMs: 60_000 });
    const r2 = rateLimit(`key-b-${ts}`, { maxRequests: 2, windowMs: 60_000 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it("resetAt é no futuro", () => {
    const result = rateLimit("test-key-reset-" + Date.now(), { maxRequests: 5, windowMs: 10_000 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("RATE_LIMITS presets", () => {
  it("existem todos os presets esperados", () => {
    expect(RATE_LIMITS.api).toBeDefined();
    expect(RATE_LIMITS.webhook).toBeDefined();
    expect(RATE_LIMITS.ai).toBeDefined();
    expect(RATE_LIMITS.upload).toBeDefined();
  });

  it("webhook tem limite maior que ai", () => {
    expect(RATE_LIMITS.webhook.maxRequests).toBeGreaterThan(RATE_LIMITS.ai.maxRequests);
  });
});
