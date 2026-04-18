export const ATTENDANT_ROLES = [
  { value: "admin", label: "Admin", description: "Acesso total" },
  { value: "sdr_manager", label: "Gerente SDR", description: "Gerencia time de prospeccao" },
  { value: "sdr", label: "SDR / Pre-venda", description: "Prospecta e qualifica leads" },
  { value: "closer_manager", label: "Gerente Closer", description: "Gerencia time de fechamento" },
  { value: "closer", label: "Closer / Vendedor", description: "Fecha leads qualificados" },
  { value: "attendant", label: "Atendente", description: "Atendimento geral (inbound)" },
] as const;

export type AttendantRole = (typeof ATTENDANT_ROLES)[number]["value"];
