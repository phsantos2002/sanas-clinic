import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Activity, Pause, Sparkles } from "lucide-react";
import type { MetaAd } from "@/app/actions/meta";

// ─── Formatters ───

export function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtBrl(n: number) {
  return `R$ ${fmt(n)}`;
}

// ─── Constants ───

export const BID_STRATEGIES: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP: "Menor Custo",
  LOWEST_COST_WITH_BID_CAP: "Bid Cap",
  COST_CAP: "Cost Cap",
  LOWEST_COST_WITH_MIN_ROAS: "ROAS Mínimo",
};

export const OBJECTIVES: Record<string, string> = {
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Vendas",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_APP_PROMOTION: "App",
  CONVERSIONS: "Conversões",
  LINK_CLICKS: "Cliques no Link",
  LEAD_GENERATION: "Geração de Leads",
  MESSAGES: "Mensagens",
  UNKNOWN: "Outro",
};

export const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Saiba mais" },
  { value: "SHOP_NOW", label: "Comprar agora" },
  { value: "SIGN_UP", label: "Cadastre-se" },
  { value: "BOOK_TRAVEL", label: "Reservar" },
  { value: "CONTACT_US", label: "Fale conosco" },
  { value: "GET_QUOTE", label: "Obter cotação" },
  { value: "SEND_MESSAGE", label: "Enviar mensagem" },
  { value: "WHATSAPP_MESSAGE", label: "WhatsApp" },
  { value: "CALL_NOW", label: "Ligar agora" },
  { value: "APPLY_NOW", label: "Candidatar-se" },
  { value: "SUBSCRIBE", label: "Assinar" },
  { value: "DOWNLOAD", label: "Download" },
];

// ─── Quality Scoring ───

export type Quality = "good" | "ok" | "bad";

export function scoreCTR(ctr: number): Quality {
  return ctr >= 1.5 ? "good" : ctr >= 0.5 ? "ok" : "bad";
}

export function scoreCPM(cpm: number): Quality {
  return cpm <= 20 ? "good" : cpm <= 50 ? "ok" : "bad";
}

export function scoreCPC(cpc: number): Quality {
  return cpc <= 2 ? "good" : cpc <= 5 ? "ok" : "bad";
}

export const qualityConfig: Record<Quality, { label: string; color: string; bar: string }> = {
  good: { label: "Ótimo", color: "text-emerald-600", bar: "bg-emerald-500" },
  ok:   { label: "Regular", color: "text-amber-600", bar: "bg-amber-400" },
  bad:  { label: "Fraco", color: "text-red-500", bar: "bg-red-400" },
};

// ─── Creative Health ───

export type CreativeHealth = "performing" | "saturating" | "declining" | "paused" | "new";

export function getCreativeHealth(ad: MetaAd): CreativeHealth {
  if (ad.status !== "ACTIVE") return "paused";
  if (ad.impressions === 0) return "new";
  if (ad.frequency >= 4) return "declining";
  if (ad.frequency >= 2.5 && ad.ctr < 0.8) return "saturating";
  if (ad.ctr < 0.3 && ad.impressions > 1000) return "declining";
  return "performing";
}

export const healthConfig: Record<CreativeHealth, { label: string; color: string; bg: string; icon: LucideIcon; tip: string }> = {
  performing: { label: "Performando", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: TrendingUp, tip: "Criativo com bom desempenho. Mantenha ativo." },
  saturating: { label: "Saturando", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Activity, tip: "Frequência alta e CTR caindo. Prepare um criativo substituto." },
  declining:  { label: "Esgotar/Pausar", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: TrendingDown, tip: "Frequência muito alta ou CTR muito baixo. Considere pausar e substituir." },
  paused:     { label: "Pausado", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", icon: Pause, tip: "Criativo pausado." },
  new:        { label: "Novo", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Sparkles, tip: "Sem dados suficientes ainda. Aguarde 2-3 dias para avaliar." },
};

// ─── Shared Types ───

export type Stage = { id: string; name: string; eventName: string };

// Re-export types from meta actions for convenience
export type {
  MetaCampaignFull,
  MetaAdSet,
  MetaAd,
  MetaCampaignInsights,
} from "@/app/actions/meta";
