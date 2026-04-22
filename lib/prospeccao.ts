export const ATTENDANT_ROLES = [
  { value: "admin", label: "Administrador", description: "Acesso total ao sistema" },
  {
    value: "manager",
    label: "Gerente",
    description: "Gerencia o time e visualiza todas as conversas",
  },
  { value: "seller", label: "Vendedor", description: "Responsavel por fechar negocios" },
  { value: "cs", label: "CS", description: "Customer Success — atendimento e pos-venda" },
] as const;

export type AttendantRole = (typeof ATTENDANT_ROLES)[number]["value"];

// Map of legacy role values to current ones — used to render existing data with friendly labels.
export const LEGACY_ROLE_LABELS: Record<string, string> = {
  sdr: "Vendedor",
  sdr_manager: "Gerente",
  closer: "Vendedor",
  closer_manager: "Gerente",
  attendant: "CS",
};

// Canonical role mapping (legacy → current). Used to group users by effective role.
export const CANONICAL_ROLE: Record<string, AttendantRole> = {
  admin: "admin",
  manager: "manager",
  seller: "seller",
  cs: "cs",
  sdr: "seller",
  sdr_manager: "manager",
  closer: "seller",
  closer_manager: "manager",
  attendant: "cs",
};

export function toCanonicalRole(role: string | null | undefined): AttendantRole {
  if (!role) return "seller";
  return CANONICAL_ROLE[role] ?? "seller";
}

// Roles that should receive auto-assigned leads (round-robin).
export const AUTO_ASSIGN_ROLES: string[] = [
  "seller",
  "cs",
  "manager",
  // legacy values kept so existing attendants still receive leads
  "sdr",
  "sdr_manager",
  "closer",
  "closer_manager",
  "attendant",
];
