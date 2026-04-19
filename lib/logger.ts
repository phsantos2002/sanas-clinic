/**
 * Logger estruturado para o Sanas Pulse.
 *
 * Emite JSON em produção (compatível com Vercel Log Drain, Datadog, Sentry, etc.)
 * e texto colorido + legível em desenvolvimento.
 *
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   logger.info("webhook_processed", { userId, phone, messageId });
 *   logger.error("ai_reply_failed", { userId }, err);
 *   const child = logger.child({ requestId: "abc123" });
 *   child.warn("rate_limit_exceeded", { ip });
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Respeita LOG_LEVEL env. Default: "info" em prod, "debug" em dev.
function getMinLevel(): number {
  const env = process.env.LOG_LEVEL as LogLevel | undefined;
  if (env && LEVELS[env] !== undefined) return LEVELS[env];
  return process.env.NODE_ENV === "production" ? LEVELS.info : LEVELS.debug;
}

const IS_PROD = process.env.NODE_ENV === "production";

// Cores ANSI apenas em dev
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function serialize(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify({
      message: value.message,
      name: value.name,
      stack: value.stack,
    });
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function emit(
  level: LogLevel,
  event: string,
  context: LogContext,
  error?: unknown,
  bindings: LogContext = {}
): void {
  if (LEVELS[level] < getMinLevel()) return;

  const timestamp = new Date().toISOString();
  const merged = { ...bindings, ...context };

  if (IS_PROD) {
    // JSON estruturado — uma linha por log
    const entry: Record<string, unknown> = {
      ts: timestamp,
      level,
      event,
      ...merged,
    };
    if (error !== undefined) {
      entry.err =
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : error;
    }
    // Usar process.stdout para evitar buffering do console
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    // Dev: legível com cores
    const color = COLORS[level];
    const prefix = `${color}[${level.toUpperCase()}]${RESET}`;
    const parts = [`${prefix} ${timestamp} — ${event}`];
    if (Object.keys(merged).length > 0) {
      parts.push(serialize(merged));
    }
    if (error !== undefined) {
      parts.push(serialize(error));
    }
    const output = parts.join(" ");
    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

export interface Logger {
  debug(event: string, ctx?: LogContext, error?: unknown): void;
  info(event: string, ctx?: LogContext, error?: unknown): void;
  warn(event: string, ctx?: LogContext, error?: unknown): void;
  error(event: string, ctx?: LogContext, error?: unknown): void;
  /** Cria um logger filho com contexto fixo propagado em todos os logs. */
  child(bindings: LogContext): Logger;
}

function createLogger(bindings: LogContext = {}): Logger {
  return {
    debug: (event, ctx = {}, error) => emit("debug", event, ctx, error, bindings),
    info: (event, ctx = {}, error) => emit("info", event, ctx, error, bindings),
    warn: (event, ctx = {}, error) => emit("warn", event, ctx, error, bindings),
    error: (event, ctx = {}, error) => emit("error", event, ctx, error, bindings),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

/**
 * Instância global do logger.
 * Em rotas / services, preferir criar um logger filho com requestId:
 *   const log = logger.child({ requestId, userId });
 */
export const logger = createLogger();
