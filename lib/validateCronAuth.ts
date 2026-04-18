/**
 * Validação centralizada de autenticação para rotas de cron.
 *
 * CORREÇÃO CRÍTICA (Sprint 1):
 * A lógica anterior era: `authHeader !== secret && process.env.CRON_SECRET`
 * isso significa: "só bloqueia se a var existir E não bater" — sem a var, QUALQUER UM passava.
 *
 * Lógica correta: bloqueia se a var NÃO existir OU se o header não bater.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Valida o header Authorization da rota de cron.
 * Retorna `null` se autorizado, ou um `NextResponse` 401 se não autorizado.
 * Uso: const deny = validateCronAuth(req); if (deny) return deny;
 */
export function validateCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  // Se CRON_SECRET não está configurado, bloquear SEMPRE — falha segura
  if (!secret) {
    logger.error("cron_auth_missing_secret", {
      path: new URL(req.url).pathname,
      msg: "CRON_SECRET não configurado — cron bloqueado por segurança",
    });
    return NextResponse.json(
      { error: "Cron secret not configured" },
      { status: 401 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    logger.warn("cron_auth_invalid", {
      path: new URL(req.url).pathname,
      hasHeader: !!authHeader,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
