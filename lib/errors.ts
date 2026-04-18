/**
 * Hierarquia de erros do Sanas Pulse.
 *
 * Usar essas classes em vez de `new Error(...)` genérico permite:
 *  - Distinguir tipo de falha no apiHandler e gerar HTTP status correto
 *  - Serializar metadados estruturados para o logger
 *  - Filtrar / ignorar erros esperados no Sentry (ex: NotFoundError, ValidationError)
 *
 * Uso:
 *   throw new ValidationError("phone é obrigatório");
 *   throw new AuthError();
 *   throw new NotFoundError("Lead", leadId);
 *   throw new ConflictError("Lead já existe com este telefone");
 *   throw new ExternalServiceError("Meta Ads", err);
 */

/** Base de todos os erros de domínio da aplicação. */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  /** Código de máquina — use em i18n ou no cliente para mapear mensagem. */
  abstract readonly code: string;

  /** Metadados extras para logging estruturado. */
  readonly meta: Record<string, unknown>;

  constructor(message: string, meta: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.meta = meta;
    // Preservar stack trace correto em V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      meta: this.meta,
    };
  }
}

// ─── 400 Bad Request ─────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";

  constructor(message: string, meta: Record<string, unknown> = {}) {
    super(message, meta);
  }
}

// ─── 401 Unauthorized ────────────────────────────────────────────────────────

export class AuthError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Não autenticado", meta: Record<string, unknown> = {}) {
    super(message, meta);
  }
}

// ─── 403 Forbidden ───────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "Acesso negado", meta: Record<string, unknown> = {}) {
    super(message, meta);
  }
}

// ─── 404 Not Found ───────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";

  constructor(resource: string, id?: string, meta: Record<string, unknown> = {}) {
    const message = id
      ? `${resource} não encontrado: ${id}`
      : `${resource} não encontrado`;
    super(message, { resource, id, ...meta });
  }
}

// ─── 409 Conflict ────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";

  constructor(message: string, meta: Record<string, unknown> = {}) {
    super(message, meta);
  }
}

// ─── 422 Unprocessable Entity ────────────────────────────────────────────────

export class UnprocessableError extends AppError {
  readonly statusCode = 422;
  readonly code = "UNPROCESSABLE";

  constructor(message: string, meta: Record<string, unknown> = {}) {
    super(message, meta);
  }
}

// ─── 429 Too Many Requests ───────────────────────────────────────────────────

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly code = "RATE_LIMIT_EXCEEDED";

  constructor(
    message = "Muitas requisições. Tente novamente em instantes.",
    meta: Record<string, unknown> = {}
  ) {
    super(message, meta);
  }
}

// ─── 502 Bad Gateway (serviços externos) ─────────────────────────────────────

export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly code = "EXTERNAL_SERVICE_ERROR";

  constructor(service: string, cause?: unknown, meta: Record<string, unknown> = {}) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause ?? "");
    super(`Falha no serviço externo: ${service}. ${causeMsg}`.trim(), {
      service,
      ...meta,
    });
    if (cause instanceof Error) {
      this.stack = cause.stack;
    }
  }
}

// ─── 500 Internal Server Error ───────────────────────────────────────────────

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code = "INTERNAL_ERROR";

  constructor(message = "Erro interno do servidor", meta: Record<string, unknown> = {}) {
    super(message, meta);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retorna true se o erro é uma instância conhecida de AppError.
 * Use para distinguir erros de domínio de erros inesperados.
 */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

/**
 * Converte um erro desconhecido para AppError.
 * Útil em catch blocks onde `err` tem tipo `unknown`.
 */
export function toAppError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Error) return new InternalError(err.message);
  return new InternalError(String(err));
}

/**
 * Mapeia status HTTP para a classe de erro correspondente.
 * Útil ao consumir APIs externas e propagar o status.
 */
export function fromHttpStatus(
  status: number,
  message: string,
  meta: Record<string, unknown> = {}
): AppError {
  if (status === 400) return new ValidationError(message, meta);
  if (status === 401) return new AuthError(message, meta);
  if (status === 403) return new ForbiddenError(message, meta);
  if (status === 404) return new NotFoundError(message, undefined, meta);
  if (status === 409) return new ConflictError(message, meta);
  if (status === 429) return new RateLimitError(message, meta);
  return new InternalError(message, meta);
}
