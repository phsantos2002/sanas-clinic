"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { normalizeAttendantRole, type SessionContext } from "@/lib/session";

// resolveSession() é a fonte única de verdade sobre "quem sou eu": dono (tenant)
// ou vendedor (Attendant → tenant do dono). Tipos e helpers síncronos ficam em
// lib/session.ts, pois este arquivo é "use server" (só pode exportar async).

/**
 * Resolve a sessão atual: dono (tenant) ou vendedor (Attendant → tenant do dono).
 * Retorna null se não autenticado ou não provisionado.
 */
export async function resolveSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  // 1) Dono? email presente na tabela User = é o próprio tenant.
  const owner = await prisma.user.findUnique({ where: { email: authUser.email } });
  if (owner) {
    return {
      tenantId: owner.id,
      user: owner,
      role: "owner",
      attendantId: null,
      authUserId: authUser.id,
      authEmail: authUser.email,
    };
  }

  // 2) Vendedor? Attendant ligado por authUserId (ou authEmail no 1º login).
  const attendant = await prisma.attendant.findFirst({
    where: {
      isActive: true,
      OR: [{ authUserId: authUser.id }, { authEmail: authUser.email }],
    },
  });
  if (attendant) {
    const tenant = await prisma.user.findUnique({ where: { id: attendant.userId } });
    if (!tenant) return null;

    // Backfill do vínculo de auth no primeiro login (linkagem por email → id).
    if (attendant.authUserId !== authUser.id) {
      await prisma.attendant.update({
        where: { id: attendant.id },
        data: { authUserId: authUser.id, inviteStatus: "active" },
      });
    }

    return {
      tenantId: tenant.id,
      user: tenant,
      role: normalizeAttendantRole(attendant.role),
      attendantId: attendant.id,
      authUserId: authUser.id,
      authEmail: authUser.email,
    };
  }

  return null;
}

/**
 * Retorna o User do TENANT (dono) da sessão atual — para um vendedor, retorna
 * o dono. Mantém a assinatura histórica: todos os call-sites que isolam por
 * `user.id` continuam isolando corretamente pelo tenant.
 */
export async function getCurrentUser(): Promise<User | null> {
  const ctx = await resolveSession();
  return ctx?.user ?? null;
}
