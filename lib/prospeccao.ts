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
  sdr: "Vendedor (legado SDR)",
  sdr_manager: "Gerente (legado SDR)",
  closer: "Vendedor (legado Closer)",
  closer_manager: "Gerente (legado Closer)",
  attendant: "CS (legado Atendente)",
};

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
