/**
 * Typed errors for Uazapi integration.
 * Allows discriminated try/catch and structured logging.
 */

export class UazApiError extends Error {
  readonly status?: number;
  readonly path?: string;
  readonly retriable: boolean;

  constructor(message: string, opts: { status?: number; path?: string; retriable?: boolean } = {}) {
    super(message);
    this.name = "UazApiError";
    this.status = opts.status;
    this.path = opts.path;
    this.retriable = opts.retriable ?? false;
  }
}

export class UazApiAuthError extends UazApiError {
  constructor(message = "Token Uazapi inválido ou expirado", path?: string) {
    super(message, { status: 401, path, retriable: false });
    this.name = "UazApiAuthError";
  }
}

export class UazApiNotFoundError extends UazApiError {
  constructor(message = "Recurso Uazapi não encontrado", path?: string) {
    super(message, { status: 404, path, retriable: false });
    this.name = "UazApiNotFoundError";
  }
}

export class UazApiRateLimitError extends UazApiError {
  readonly retryAfterMs?: number;
  constructor(
    message = "Rate limit Uazapi excedido",
    opts: { path?: string; retryAfterMs?: number } = {}
  ) {
    super(message, { status: 429, path: opts.path, retriable: true });
    this.name = "UazApiRateLimitError";
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export class UazApiTimeoutError extends UazApiError {
  constructor(message = "Timeout ao chamar Uazapi", path?: string) {
    super(message, { status: 408, path, retriable: true });
    this.name = "UazApiTimeoutError";
  }
}

export class UazApiUnavailableError extends UazApiError {
  constructor(
    message = "Uazapi temporariamente indisponível",
    opts: { status?: number; path?: string } = {}
  ) {
    super(message, { status: opts.status ?? 503, path: opts.path, retriable: true });
    this.name = "UazApiUnavailableError";
  }
}

export class UazApiCircuitOpenError extends UazApiError {
  constructor(message = "Circuit breaker aberto — Uazapi em degradação") {
    super(message, { status: 503, retriable: false });
    this.name = "UazApiCircuitOpenError";
  }
}

/**
 * Map a HTTP status to the correct typed error class.
 */
export function errorFromStatus(status: number, body: string, path?: string): UazApiError {
  if (status === 401 || status === 403) return new UazApiAuthError(body || undefined, path);
  if (status === 404) return new UazApiNotFoundError(body || undefined, path);
  if (status === 429) return new UazApiRateLimitError(body || undefined, { path });
  if (status === 408 || status === 425) return new UazApiTimeoutError(body || undefined, path);
  if (status >= 500) return new UazApiUnavailableError(body || undefined, { status, path });
  return new UazApiError(body || `HTTP ${status}`, { status, path });
}
