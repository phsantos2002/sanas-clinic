import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function captureStdout(fn: () => void): string {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  };
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return chunks.join("");
}

function parseLogLine(line: string): Record<string, unknown> {
  return JSON.parse(line.trim());
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const env = process.env as Record<string, string>;

beforeEach(() => {
  env.NODE_ENV = "production"; // forçar JSON output
  env.LOG_LEVEL = "debug";
});

afterEach(() => {
  env.NODE_ENV = "test";
  env.LOG_LEVEL = "error";
});

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("logger", () => {
  describe("output JSON em produção", () => {
    it("emite JSON com campos obrigatórios em info()", () => {
      const output = captureStdout(() => {
        logger.info("webhook_processed", { userId: "u1", phone: "5511999" });
      });

      const log = parseLogLine(output);
      expect(log.level).toBe("info");
      expect(log.event).toBe("webhook_processed");
      expect(log.userId).toBe("u1");
      expect(log.phone).toBe("5511999");
      expect(typeof log.ts).toBe("string");
    });

    it("emite JSON com level=warn em warn()", () => {
      const output = captureStdout(() => {
        logger.warn("rate_limit_exceeded", { ip: "1.2.3.4" });
      });
      const log = parseLogLine(output);
      expect(log.level).toBe("warn");
    });

    it("emite JSON com level=error em error()", () => {
      const output = captureStdout(() => {
        logger.error("ai_reply_failed", { userId: "u2" }, new Error("timeout"));
      });
      const log = parseLogLine(output);
      expect(log.level).toBe("error");
      expect((log.err as Record<string, unknown>).message).toBe("timeout");
    });

    it("serializa Error no campo err", () => {
      const err = new Error("algo quebrou");
      const output = captureStdout(() => {
        logger.error("test_error", {}, err);
      });
      const log = parseLogLine(output);
      expect(log.err).toBeDefined();
      expect((log.err as Record<string, unknown>).name).toBe("Error");
      expect((log.err as Record<string, unknown>).message).toBe("algo quebrou");
    });

    it("não emite debug quando LOG_LEVEL=info", () => {
      process.env.LOG_LEVEL = "info";
      const output = captureStdout(() => {
        logger.debug("debug_event", { x: 1 });
      });
      expect(output).toBe("");
    });

    it("emite debug quando LOG_LEVEL=debug", () => {
      process.env.LOG_LEVEL = "debug";
      const output = captureStdout(() => {
        logger.debug("debug_event", { x: 1 });
      });
      expect(output).not.toBe("");
      const log = parseLogLine(output);
      expect(log.level).toBe("debug");
    });
  });

  describe("logger.child()", () => {
    it("propaga bindings em todos os logs", () => {
      const child = logger.child({ requestId: "req_abc", userId: "u99" });
      const output = captureStdout(() => {
        child.info("child_event", { extra: "data" });
      });
      const log = parseLogLine(output);
      expect(log.requestId).toBe("req_abc");
      expect(log.userId).toBe("u99");
      expect(log.extra).toBe("data");
    });

    it("child de child propaga bindings aninhados", () => {
      const child = logger.child({ requestId: "req_1" });
      const grandchild = child.child({ subModule: "webhook" });
      const output = captureStdout(() => {
        grandchild.info("deep_event");
      });
      const log = parseLogLine(output);
      expect(log.requestId).toBe("req_1");
      expect(log.subModule).toBe("webhook");
    });

    it("contexto filho não contamina o logger pai", () => {
      const child = logger.child({ privateCtx: "secret" });
      // silencia o child
      const childOut = captureStdout(() => child.info("x"));
      expect(parseLogLine(childOut).privateCtx).toBe("secret");

      // pai não deve ter privateCtx
      const parentOut = captureStdout(() => logger.info("y"));
      expect(parseLogLine(parentOut).privateCtx).toBeUndefined();
    });
  });

  describe("contexto passado por parâmetro", () => {
    it("inclui todos os campos do contexto", () => {
      const output = captureStdout(() => {
        logger.info("lead_created", { leadId: "l1", source: "meta", score: 72 });
      });
      const log = parseLogLine(output);
      expect(log.leadId).toBe("l1");
      expect(log.source).toBe("meta");
      expect(log.score).toBe(72);
    });

    it("contexto vazio não gera campos extras", () => {
      const output = captureStdout(() => {
        logger.info("minimal_event");
      });
      const log = parseLogLine(output);
      expect(log.event).toBe("minimal_event");
      // Não deve ter chaves inesperadas além das obrigatórias
      const expectedKeys = new Set(["ts", "level", "event"]);
      const actualKeys = Object.keys(log).filter(k => !expectedKeys.has(k));
      expect(actualKeys).toHaveLength(0);
    });
  });
});
