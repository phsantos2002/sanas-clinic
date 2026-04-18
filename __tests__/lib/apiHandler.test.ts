/**
 * Testes para lib/apiHandler.ts
 *
 * Como Next.js NextRequest/NextResponse precisam de ambiente específico,
 * testamos a lógica de classificação de erros de forma isolada.
 *
 * Testes E2E que exercitam o handler completo via HTTP devem ficar em __tests__/e2e/
 */

import { describe, it, expect } from "vitest";
import {
  ValidationError,
  AuthError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  InternalError,
  isAppError,
  toAppError,
} from "@/lib/errors";

// ─── Lógica de classificação de erros ────────────────────────────────────────
// Extrai e testa o comportamento que apiHandler implementa internamente

function classifyError(err: unknown): { statusCode: number; code: string; message: string } {
  if (isAppError(err)) {
    return { statusCode: err.statusCode, code: err.code, message: err.message };
  }
  const appErr = toAppError(err);
  return { statusCode: appErr.statusCode, code: appErr.code, message: "Erro interno do servidor" };
}

describe("classifyError (lógica interna do apiHandler)", () => {
  it("ValidationError → 400", () => {
    const result = classifyError(new ValidationError("campo obrigatório"));
    expect(result.statusCode).toBe(400);
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("campo obrigatório");
  });

  it("AuthError → 401", () => {
    const result = classifyError(new AuthError());
    expect(result.statusCode).toBe(401);
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("NotFoundError → 404", () => {
    const result = classifyError(new NotFoundError("Lead", "abc"));
    expect(result.statusCode).toBe(404);
    expect(result.code).toBe("NOT_FOUND");
  });

  it("RateLimitError → 429", () => {
    const result = classifyError(new RateLimitError());
    expect(result.statusCode).toBe(429);
    expect(result.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("ExternalServiceError → 502", () => {
    const result = classifyError(new ExternalServiceError("Meta Ads"));
    expect(result.statusCode).toBe(502);
  });

  it("Error genérico → 500 com mensagem genérica", () => {
    const result = classifyError(new Error("erro inesperado"));
    expect(result.statusCode).toBe(500);
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).toBe("Erro interno do servidor");
  });

  it("string → 500", () => {
    const result = classifyError("ops, algo deu errado");
    expect(result.statusCode).toBe(500);
    expect(result.code).toBe("INTERNAL_ERROR");
  });

  it("null → 500", () => {
    const result = classifyError(null);
    expect(result.statusCode).toBe(500);
  });

  it("undefined → 500", () => {
    const result = classifyError(undefined);
    expect(result.statusCode).toBe(500);
  });
});

// ─── Garantia de que erros de domínio têm statusCode semântico ───────────────

describe("statusCodes semânticos por tipo de erro", () => {
  const cases: Array<[label: string, error: unknown, expectedStatus: number]> = [
    ["ValidationError",    new ValidationError("x"),         400],
    ["AuthError",          new AuthError(),                   401],
    ["NotFoundError",      new NotFoundError("R"),            404],
    ["RateLimitError",     new RateLimitError(),              429],
    ["ExternalServiceError", new ExternalServiceError("S"),  502],
    ["InternalError",      new InternalError(),               500],
    ["Error genérico",     new Error("x"),                    500],
  ];

  it.each(cases)("%s → %i", (_label: string, error: unknown, expectedStatus: number) => {
    const { statusCode } = classifyError(error);
    expect(statusCode).toBe(expectedStatus);
  });
});
