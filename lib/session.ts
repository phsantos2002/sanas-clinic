import type { User } from "@prisma/client";

// Papéis e helpers de sessão (módulo puro — sem "use server", pode exportar
// funções síncronas e tipos, ao contrário de app/actions/user.ts).
//
// O tenant continua sendo o User do dono. Um vendedor NÃO é um User próprio:
// é um Attendant com identidade Supabase, resolvido para o tenant do dono.

export type SessionRole = "owner" | "admin" | "manager" | "seller" | "cs";

// Papéis que enxergam apenas os leads atribuídos a si.
const RESTRICTED_ROLES: ReadonlySet<SessionRole> = new Set(["seller", "cs"]);

export interface SessionContext {
  tenantId: string; // SEMPRE o User.id do dono — a mesma chave userId de hoje
  user: User; // o User do dono (o tenant)
  role: SessionRole;
  attendantId: string | null; // null quando a sessão é do dono
  authUserId: string; // supabase auth.users.id de quem está logado
  authEmail: string;
}

/** Normaliza o `role` livre do Attendant para um SessionRole conhecido.
 *  Por segurança (menor privilégio), qualquer papel legado/desconhecido
 *  cai em "seller" (restrito). */
export function normalizeAttendantRole(role: string): SessionRole {
  switch (role) {
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "cs":
      return "cs";
    default:
      return "seller"; // seller, sdr, closer, attendant, etc.
  }
}

export function isRestrictedRole(role: SessionRole): boolean {
  return RESTRICTED_ROLES.has(role);
}
