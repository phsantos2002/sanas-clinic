/**
 * Wrapper padronizado para rotas da API do Next.js.
 *
 * Elimina a repetição de try/catch em cada rota e garante:
 *  - Logging estruturado de requests e erros
 *  - Serialização consistente de respostas de erro
 *  - Propagação correta de HTTP status via AppError
 *  - requestId propagado para rastreabilidade
 *
 * Uso básico:
 *   export const POST = apiHandler(async (req) => {
 *     const body = await req.json();
 *     // ... lógica ...
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * Com contexto de rota (params):
 *   export const GET = apiHandler(async (req, ctx) => {
 *     const { id } = await ctx.params;
 *     return NextResponse.json({ id });
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import { isAppError, toAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";

export type RouteContext = {
  params: Promise<Record<string, string>>;
};

export type ApiHandler = (
  req: NextRequest,
  ctx?: RouteContext
) => Promise<NextResponse>;

/**
 * Cria um handler de rota com tratamento de erros padronizado.
 */
export function apiHandler(fn: ApiHandler): ApiHandler {
  return async (req: NextRequest, ctx?: RouteContext) => {
    const requestId = nanoid(10);
    const start = Date.now();

    // Logger filho com contexto da requisição
    const log = logger.child({
      requestId,
      method: req.method,
      path: new URL(req.url).pathname,
    });

    log.debug("request_start");

    try {
      const response = await fn(req, ctx);
      const duration = Date.now() - start;
      log.info("request_complete", { status: response.status, durationMs: duration });
      return response;
    } catch (err: unknown) {
      const duration = Date.now() - start;

      if (isAppError(err)) {
        // Erro de domínio esperado — log como warn (não alerta crítico)
        log.warn("request_error", {
          errorCode: err.code,
          statusCode: err.statusCode,
          message: err.message,
          durationMs: duration,
          ...err.meta,
        });
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.statusCode }
        );
      }

      // Erro inesperado — log completo com stack
      const appErr = toAppError(err);
      log.error("request_unhandled_error", { durationMs: duration }, err);

      return NextResponse.json(
        {
          error: "Erro interno do servidor",
          code: appErr.code,
          requestId, // permite correlacionar com logs
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wrapper específico para rotas de webhook.
 * Diferença: erros de parsing retornam 400 em vez de 500,
 * e o body é pré-lido e logado para debug.
 */
export function webhookHandler(fn: ApiHandler): ApiHandler {
  return apiHandler(async (req, ctx) => {
    // Garante que erros de JSON parsing viram 400
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        await req.clone().json();
      } catch {
        return NextResponse.json(
          { error: "Body JSON inválido", code: "INVALID_JSON" },
          { status: 400 }
        );
      }
    }
    return fn(req, ctx);
  });
}

/**
 * Helper: retorna JSON padronizado de sucesso.
 * Equivalente a NextResponse.json(data) mas com status explícito.
 */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Helper: retorna 204 No Content.
 */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
