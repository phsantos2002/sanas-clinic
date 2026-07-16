import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client admin (service-role) — SOMENTE servidor. Usado para convidar
 * vendedores por email (auth.admin.inviteUserByEmail).
 *
 * Retorna null se SUPABASE_SERVICE_ROLE_KEY não estiver configurada — o fluxo
 * de convite degrada graciosamente: o vendedor pode se cadastrar normalmente
 * com o mesmo email e a linkagem acontece em resolveSession() (por authEmail).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
