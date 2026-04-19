"use client";

import { useState, useEffect, useTransition } from "react";
import {
  ChevronDown,
  ChevronRight,
  Settings,
  Save,
  X,
  Zap,
  DollarSign,
  Target,
  TrendingUp,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";
import { saveCampaignConfig } from "@/app/actions/pixel";
import type { CampaignConfig } from "@/types";

type Props = {
  campaignId: string;
  campaignName: string;
  config: CampaignConfig | null;
  onSaved?: (config: CampaignConfig) => void;
  forceExpanded?: boolean;
  accountPhase?: string | null;
};

const OBJECTIVE_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "MESSAGES", label: "Mensagens" },
  { value: "CONVERSIONS", label: "Conversões" },
  { value: "LEADS", label: "Geração de Leads" },
  { value: "ENGAGEMENT", label: "Engajamento" },
  { value: "TRAFFIC", label: "Tráfego" },
  { value: "SALES", label: "Vendas" },
];

const DESTINATION_OPTIONS = [
  { value: "", label: "Selecione" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBSITE", label: "Website / Landing Page" },
  { value: "INSTAGRAM", label: "Instagram Direct" },
  { value: "FORM", label: "Formulário Nativo" },
  { value: "STORE", label: "Loja / E-commerce" },
];

const SEGMENT_OPTIONS = [
  { value: "", label: "Não configurado" },
  { value: "HEALTH", label: "Saúde / Clínicas" },
  { value: "EDUCATION", label: "Educação" },
  { value: "ECOMMERCE", label: "E-commerce" },
  { value: "SERVICES", label: "Serviços" },
  { value: "REAL_ESTATE", label: "Imobiliário" },
  { value: "FOOD", label: "Alimentação" },
  { value: "FITNESS", label: "Fitness / Academia" },
  { value: "BEAUTY", label: "Beleza / Estética" },
  { value: "LEGAL", label: "Jurídico" },
  { value: "OTHER", label: "Outro" },
];

const OBJECTIVE_ICONS: Record<string, string> = {
  MESSAGES: "💬",
  CONVERSIONS: "🛒",
  LEADS: "📋",
  ENGAGEMENT: "📸",
  TRAFFIC: "🌐",
  SALES: "🛒",
  AWARENESS: "📢",
};

const DESTINATION_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  FORM: "Formulário",
  STORE: "Loja",
};

const SEGMENT_LABELS: Record<string, string> = {
  HEALTH: "Saúde",
  EDUCATION: "Educação",
  ECOMMERCE: "E-commerce",
  SERVICES: "Serviços",
  REAL_ESTATE: "Imobiliário",
  FOOD: "Alimentação",
  FITNESS: "Fitness",
  BEAUTY: "Beleza",
  LEGAL: "Jurídico",
  OTHER: "Outro",
};

const BID_LABELS: Record<string, string> = {
  LOWEST_COST: "Menor Custo",
  COST_CAP: "Cost Cap",
  BID_CAP: "Bid Cap",
  ROAS_MIN: "ROAS Mínimo",
};

type StrategyCard = {
  value: string;
  label: string;
  subtitle: string;
  description: string;
  icon: typeof Zap;
  color: string;
  border: string;
  bg: string;
  needsField: boolean;
  fieldLabel: string;
  fieldPlaceholder: string;
  fieldStep: string;
  locked?: boolean;
};

const STRATEGY_CARDS: StrategyCard[] = [
  {
    value: "LOWEST_COST",
    label: "Menor Custo",
    subtitle: "Automático",
    description: "Ideal para começar",
    icon: Zap,
    color: "text-emerald-700",
    border: "border-emerald-300",
    bg: "bg-emerald-50",
    needsField: false,
    fieldLabel: "",
    fieldPlaceholder: "",
    fieldStep: "",
  },
  {
    value: "COST_CAP",
    label: "Cost Cap",
    subtitle: "Custo médio controlado",
    description: "Ideal para controlar gasto",
    icon: DollarSign,
    color: "text-blue-700",
    border: "border-blue-300",
    bg: "bg-blue-50",
    needsField: true,
    fieldLabel: "Custo Máx. por Resultado (R$)",
    fieldPlaceholder: "Ex: 25",
    fieldStep: "1",
  },
  {
    value: "BID_CAP",
    label: "Bid Cap",
    subtitle: "Lance máximo por clique",
    description: "Ideal para controle total",
    icon: Target,
    color: "text-violet-700",
    border: "border-violet-300",
    bg: "bg-violet-50",
    needsField: true,
    fieldLabel: "Lance Máximo (R$)",
    fieldPlaceholder: "Ex: 10",
    fieldStep: "0.5",
  },
  {
    value: "ROAS_MIN",
    label: "ROAS Mínimo",
    subtitle: "Retorno garantido",
    description: "Ideal para vendas diretas",
    icon: TrendingUp,
    color: "text-amber-700",
    border: "border-amber-300",
    bg: "bg-amber-50",
    needsField: true,
    fieldLabel: "ROAS Mínimo",
    fieldPlaceholder: "Ex: 3.0",
    fieldStep: "0.1",
  },
];

function fmtBrl(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CampaignConfigPanel({
  campaignId,
  campaignName,
  config,
  onSaved,
  forceExpanded,
  accountPhase,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [objective, setObjective] = useState(config?.campaignObjective ?? "");
  const [destination, setDestination] = useState(config?.conversionDestination ?? "");
  const [bidStrategy, setBidStrategy] = useState(config?.bidStrategy ?? "LOWEST_COST");
  const [segment, setSegment] = useState(config?.businessSegment ?? "");
  const [conversionValue, setConversionValue] = useState(config?.conversionValue?.toString() ?? "");
  const [maxCost, setMaxCost] = useState(config?.maxCostPerResult?.toString() ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState(config?.monthlyBudget?.toString() ?? "");
  const [bidValue, setBidValue] = useState(config?.bidValue?.toString() ?? "");

  useEffect(() => {
    if (forceExpanded) setExpanded(true);
  }, [forceExpanded]);

  const isLearning = accountPhase === "LEARNING";

  function handleSave() {
    if (!objective) {
      toast.error("Selecione o objetivo da campanha");
      return;
    }
    if (!destination) {
      toast.error("Selecione o destino de conversão");
      return;
    }

    startTransition(async () => {
      const result = await saveCampaignConfig({
        campaignId,
        campaignName,
        campaignObjective: objective,
        conversionDestination: destination,
        bidStrategy,
        businessSegment: segment || null,
        conversionValue: conversionValue ? parseFloat(conversionValue) : null,
        maxCostPerResult: maxCost ? parseFloat(maxCost) : null,
        monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
        bidValue: bidValue ? parseFloat(bidValue) : null,
      });

      if (result.success && result.data) {
        toast.success("Configuração salva");
        onSaved?.(result.data);
        setExpanded(false);
      } else {
        toast.error("success" in result && !result.success ? result.error : "Erro ao salvar");
      }
    });
  }

  // Build summary line
  function getSummary(): string {
    if (!config) return "";
    const parts: string[] = [];
    const objIcon = OBJECTIVE_ICONS[config.campaignObjective] ?? "⚙";
    const objLabel =
      OBJECTIVE_OPTIONS.find((o) => o.value === config.campaignObjective)?.label ??
      config.campaignObjective;
    const destLabel =
      DESTINATION_LABELS[config.conversionDestination] ?? config.conversionDestination;
    parts.push(`${objIcon} ${objLabel} → ${destLabel}`);
    if (config.businessSegment)
      parts.push(SEGMENT_LABELS[config.businessSegment] ?? config.businessSegment);
    if (config.monthlyBudget) parts.push(`${fmtBrl(config.monthlyBudget)}/mês`);
    parts.push(BID_LABELS[config.bidStrategy] ?? config.bidStrategy);
    if (config.maxCostPerResult) parts.push(`R$ ${config.maxCostPerResult}`);
    return parts.join("  ·  ");
  }

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Settings className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700 flex-shrink-0">Configuração</span>
          {config ? (
            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
              {getSummary()}
            </span>
          ) : (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              Não configurado
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {config && !expanded && (
            <span className="text-[10px] text-indigo-600 font-medium">Editar</span>
          )}
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-50">
          {/* Block 1: Objetivo & Destino */}
          <div className="pt-3 space-y-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              Objetivo & Destino
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Objetivo</Label>
                <CustomSelect
                  options={OBJECTIVE_OPTIONS}
                  value={objective}
                  onChange={setObjective}
                  placeholder="Selecione"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Destino de Conversão</Label>
                <CustomSelect
                  options={DESTINATION_OPTIONS}
                  value={destination}
                  onChange={setDestination}
                  placeholder="Selecione"
                />
              </div>
            </div>
          </div>

          {/* Block 2: Meu Negócio */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              Meu Negócio
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Segmento</Label>
                <CustomSelect
                  options={SEGMENT_OPTIONS}
                  value={segment}
                  onChange={setSegment}
                  placeholder="Selecione"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Valor por Conversão (R$)</Label>
                <Input
                  type="number"
                  value={conversionValue}
                  onChange={(e) => setConversionValue(e.target.value)}
                  placeholder="Ex: 150"
                  className="h-8 text-xs rounded-lg"
                  min="0"
                  step="10"
                />
              </div>
            </div>
          </div>

          {/* Block 3: Orçamento */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              Orçamento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Verba Mensal (R$)</Label>
                <Input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="Ex: 3000"
                  className="h-8 text-xs rounded-lg"
                  min="0"
                  step="100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Custo Máx. por Resultado (R$)</Label>
                <Input
                  type="number"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                  placeholder="Ex: 25"
                  className="h-8 text-xs rounded-lg"
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </div>

          {/* Block 4: Estratégia de Lance — Cards */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              Estratégia de Lance
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STRATEGY_CARDS.map((card) => {
                const isSelected = bidStrategy === card.value;
                const isLocked =
                  isLearning && (card.value === "BID_CAP" || card.value === "ROAS_MIN");
                const Icon = card.icon;

                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => !isLocked && setBidStrategy(card.value)}
                    disabled={isLocked}
                    className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                      isLocked
                        ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                        : isSelected
                          ? `${card.border} ${card.bg}`
                          : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    {isLocked && (
                      <div className="absolute top-1.5 right-1.5">
                        <Lock className="h-3 w-3 text-slate-400" />
                      </div>
                    )}
                    <Icon
                      className={`h-4 w-4 mb-1.5 ${isSelected ? card.color : "text-slate-400"}`}
                    />
                    <p
                      className={`text-[11px] font-bold ${isSelected ? card.color : "text-slate-700"}`}
                    >
                      {card.label}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{card.subtitle}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{card.description}</p>
                    {isSelected && card.value === "LOWEST_COST" && (
                      <span className="text-[8px] text-emerald-600 font-medium mt-1 inline-block">
                        Recomendado ✓
                      </span>
                    )}
                    {isLocked && (
                      <p className="text-[8px] text-slate-400 mt-1">
                        Disponível após estabilização
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bid value field below cards */}
            {(bidStrategy === "COST_CAP" ||
              bidStrategy === "BID_CAP" ||
              bidStrategy === "ROAS_MIN") && (
              <div className="max-w-xs space-y-1">
                <Label className="text-[11px]">
                  {STRATEGY_CARDS.find((c) => c.value === bidStrategy)?.fieldLabel ?? "Valor"}
                </Label>
                <Input
                  type="number"
                  value={bidStrategy === "BID_CAP" ? bidValue : maxCost}
                  onChange={(e) =>
                    bidStrategy === "BID_CAP"
                      ? setBidValue(e.target.value)
                      : setMaxCost(e.target.value)
                  }
                  placeholder={
                    STRATEGY_CARDS.find((c) => c.value === bidStrategy)?.fieldPlaceholder ?? ""
                  }
                  className="h-8 text-xs rounded-lg"
                  min="0"
                  step={STRATEGY_CARDS.find((c) => c.value === bidStrategy)?.fieldStep ?? "1"}
                />
              </div>
            )}

            {/* Phase-based tip */}
            {accountPhase && (
              <p className="text-[10px] text-slate-500">
                {accountPhase === "LEARNING" &&
                  "💡 Recomendamos Menor Custo agora. Após 50 conversões, o Cost Cap se torna mais eficiente."}
                {accountPhase === "STABILIZING" &&
                  "💡 Você já tem histórico suficiente para usar Cost Cap com segurança."}
                {accountPhase === "SCALING" &&
                  "💡 Bid Cap pode reduzir custos agora que você conhece seu CPL ideal."}
                {accountPhase === "MATURE" &&
                  "💡 Sua conta está madura — teste ROAS Mínimo para maximizar retorno."}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 h-8 text-xs rounded-xl gap-1.5"
            >
              <Save className="h-3 w-3" />
              {isPending ? "Salvando..." : "Salvar Configuração"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded(false)}
              className="h-8 text-xs rounded-xl gap-1"
            >
              <X className="h-3 w-3" />
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
