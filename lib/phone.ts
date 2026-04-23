/**
 * Utilitários de normalização de telefone — Sanas Pulse
 *
 * Sprint 2: Substitui dedupe por suffix (frágil) por match completo normalizado.
 */

/**
 * Remove todos os caracteres não numéricos de um número de telefone.
 * Retorna apenas os dígitos.
 *
 * Exemplos:
 *   "+55 (11) 98765-4321" → "5511987654321"
 *   "11 98765-4321"       → "1198765-4321" → "11987654321"
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Verifica se dois números de telefone são o mesmo após normalização.
 * Considera variações com e sem código de país 55.
 *
 * Exemplo: "11987654321" e "5511987654321" são considerados o mesmo.
 */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);

  if (na === nb) return true;

  // Brasil: comparar com e sem o DDI +55
  const stripBR = (p: string) => (p.startsWith("55") && p.length >= 12 ? p.slice(2) : p);
  return stripBR(na) === stripBR(nb);
}

/**
 * Formata um telefone normalizado para exibição (BR).
 * "5511987654321" → "+55 (11) 98765-4321"
 * "11987654321"   → "(11) 98765-4321"
 */
export function formatPhoneBR(phone: string): string {
  const digits = normalizePhone(phone);

  // Com DDI: 55 + DDD (2) + número (8-9) = 12-13 dígitos
  if (digits.startsWith("55") && digits.length >= 12) {
    const local = digits.slice(2);
    return formatLocalBR(local, true);
  }

  return formatLocalBR(digits, false);
}

function formatLocalBR(digits: string, withCountry: boolean): string {
  const prefix = withCountry ? "+55 " : "";

  if (digits.length === 11) {
    // (XX) 9XXXX-XXXX
    return `${prefix}(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    // (XX) XXXX-XXXX
    return `${prefix}(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `${prefix}${digits}`;
}

/**
 * Mascara um número de telefone para uso em logs (LGPD).
 * Mantém DDD/DDI e os 4 últimos dígitos para correlação debug.
 *
 * Exemplos:
 *   "5511987654321" → "55 11 *****-4321"
 *   "11987654321"   → "11 *****-4321"
 *   "abc"           → "***"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "***";
  const digits = normalizePhone(phone);
  if (digits.length < 4) return "***";
  const last4 = digits.slice(-4);
  if (digits.length >= 12 && digits.startsWith("55")) {
    return `55 ${digits.slice(2, 4)} *****-${last4}`;
  }
  if (digits.length === 11 || digits.length === 10) {
    return `${digits.slice(0, 2)} *****-${last4}`;
  }
  return `***${last4}`;
}
