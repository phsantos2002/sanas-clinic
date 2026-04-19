import { describe, it, expect } from "vitest";
import {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  InternalError,
  isAppError,
  toAppError,
  fromHttpStatus,
} from "@/lib/errors";

// ─── isAppError ───────────────────────────────────────────────────────────────

describe("isAppError", () => {
  it("retorna true para AppError e subclasses", () => {
    expect(isAppError(new ValidationError("inválido"))).toBe(true);
    expect(isAppError(new AuthError())).toBe(true);
    expect(isAppError(new NotFoundError("Lead", "123"))).toBe(true);
  });

  it("retorna false para Error genérico", () => {
    expect(isAppError(new Error("ops"))).toBe(false);
  });

  it("retorna false para primitivos", () => {
    expect(isAppError("string")).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError(42)).toBe(false);
  });
});

// ─── ValidationError ─────────────────────────────────────────────────────────

describe("ValidationError", () => {
  it("tem statusCode 400 e code VALIDATION_ERROR", () => {
    const err = new ValidationError("campo obrigatório");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("campo obrigatório");
  });

  it("aceita meta extras", () => {
    const err = new ValidationError("inválido", { field: "phone" });
    expect(err.meta).toEqual({ field: "phone" });
  });

  it("instanceof Error e AppError", () => {
    const err = new ValidationError("x");
    expect(err instanceof Error).toBe(true);
    expect(isAppError(err)).toBe(true);
  });
});

// ─── AuthError ───────────────────────────────────────────────────────────────

describe("AuthError", () => {
  it("tem statusCode 401 e mensagem padrão", () => {
    const err = new AuthError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Não autenticado");
  });

  it("aceita mensagem customizada", () => {
    const err = new AuthError("Token expirado");
    expect(err.message).toBe("Token expirado");
  });
});

// ─── ForbiddenError ──────────────────────────────────────────────────────────

describe("ForbiddenError", () => {
  it("tem statusCode 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });
});

// ─── NotFoundError ───────────────────────────────────────────────────────────

describe("NotFoundError", () => {
  it("formata mensagem com resource e id", () => {
    const err = new NotFoundError("Lead", "abc123");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Lead não encontrado: abc123");
    expect(err.meta).toMatchObject({ resource: "Lead", id: "abc123" });
  });

  it("formata mensagem sem id", () => {
    const err = new NotFoundError("Workflow");
    expect(err.message).toBe("Workflow não encontrado");
  });
});

// ─── ConflictError ───────────────────────────────────────────────────────────

describe("ConflictError", () => {
  it("tem statusCode 409", () => {
    const err = new ConflictError("Telefone já cadastrado");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });
});

// ─── RateLimitError ──────────────────────────────────────────────────────────

describe("RateLimitError", () => {
  it("tem statusCode 429", () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});

// ─── ExternalServiceError ────────────────────────────────────────────────────

describe("ExternalServiceError", () => {
  it("inclui nome do serviço na mensagem", () => {
    const err = new ExternalServiceError("Meta Ads");
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe("EXTERNAL_SERVICE_ERROR");
    expect(err.message).toContain("Meta Ads");
    expect(err.meta).toMatchObject({ service: "Meta Ads" });
  });

  it("inclui mensagem do erro original", () => {
    const cause = new Error("Token inválido");
    const err = new ExternalServiceError("WhatsApp", cause);
    expect(err.message).toContain("Token inválido");
  });
});

// ─── InternalError ───────────────────────────────────────────────────────────

describe("InternalError", () => {
  it("tem statusCode 500 e mensagem padrão", () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.message).toBe("Erro interno do servidor");
  });
});

// ─── toAppError ──────────────────────────────────────────────────────────────

describe("toAppError", () => {
  it("retorna a mesma instância se já é AppError", () => {
    const original = new ValidationError("x");
    expect(toAppError(original)).toBe(original);
  });

  it("converte Error genérico para InternalError", () => {
    const err = toAppError(new Error("erro inesperado"));
    expect(err instanceof InternalError).toBe(true);
    expect(err.message).toBe("erro inesperado");
  });

  it("converte string para InternalError", () => {
    const err = toAppError("algo deu errado");
    expect(err instanceof InternalError).toBe(true);
    expect(err.message).toBe("algo deu errado");
  });

  it("converte null para InternalError", () => {
    const err = toAppError(null);
    expect(err instanceof InternalError).toBe(true);
  });
});

// ─── fromHttpStatus ──────────────────────────────────────────────────────────

describe("fromHttpStatus", () => {
  it.each<[number, typeof InternalError]>([
    [400, ValidationError as unknown as typeof InternalError],
    [401, AuthError as unknown as typeof InternalError],
    [403, ForbiddenError as unknown as typeof InternalError],
    [409, ConflictError as unknown as typeof InternalError],
    [429, RateLimitError as unknown as typeof InternalError],
    [500, InternalError],
    [503, InternalError],
  ])("status %i → classe correta", (status, ErrorClass) => {
    const err = fromHttpStatus(status, "mensagem");
    expect(err instanceof ErrorClass).toBe(true);
    expect(err.statusCode).toBe(ErrorClass === InternalError && status !== 500 ? 500 : status);
  });
});

// ─── toJSON ──────────────────────────────────────────────────────────────────

describe("AppError.toJSON", () => {
  it("serializa todos os campos esperados", () => {
    const err = new ValidationError("campo inválido", { field: "email" });
    const json = err.toJSON();
    expect(json).toEqual({
      name: "ValidationError",
      code: "VALIDATION_ERROR",
      message: "campo inválido",
      statusCode: 400,
      meta: { field: "email" },
    });
  });
});
