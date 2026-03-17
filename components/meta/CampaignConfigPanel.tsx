"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Settings, Save } from "lucide-react";
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

const BID_STRATEGY_OPTIONS = [
  { value: "LOWEST_COST", label: "Menor Custo (automático)" },
  { value: "COST_CAP", label: "Cost Cap" },
  { value: "BID_CAP", label: "Bid Cap" },
  { value: "ROAS_MIN", label: "ROAS Mínimo" },
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

export function CampaignConfigPanel({ campaignId, campaignName, config, onSaved }: Props) {
  const [expanded, setExpanded] = useState(!config);
  const [isPending, startTransition] = useTransition();

  const [objective, setObjective] = useState(config?.campaignObjective ?? "");
  const [destination, setDestination] = useState(config?.conversionDestination ?? "");
  const [bidStrategy, setBidStrategy] = useState(config?.bidStrategy ?? "LOWEST_COST");
  const [segment, setSegment] = useState(config?.businessSegment ?? "");
  const [conversionValue, setConversionValue] = useState(config?.conversionValue?.toString() ?? "");
  const [maxCost, setMaxCost] = useState(config?.maxCostPerResult?.toString() ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState(config?.monthlyBudget?.toString() ?? "");
  const [bidValue, setBidValue] = useState(config?.bidValue?.toString() ?? "");

  const showBidFields = bidStrategy === "COST_CAP" || bidStrategy === "BID_CAP" || bidStrategy === "ROAS_MIN";

  function handleSave() {
    if (!objective) { toast.error("Selecione o objetivo da campanha"); return; }
    if (!destination) { toast.error("Selecione o destino de conversão"); return; }

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

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Configuração da Campanha</span>
          {!config && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
              Não configurado
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-50">
          {/* Block 1: Objetivo & Destino */}
          <div className="pt-3 space-y-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Objetivo & Destino</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Objetivo</Label>
                <CustomSelect options={OBJECTIVE_OPTIONS} value={objective} onChange={setObjective} placeholder="Selecione" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Destino de Conversão</Label>
                <CustomSelect options={DESTINATION_OPTIONS} value={destination} onChange={setDestination} placeholder="Selecione" />
              </div>
            </div>
          </div>

          {/* Block 2: Estratégia & Lance */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Estratégia & Lance</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Estratégia de Lance</Label>
                <CustomSelect options={BID_STRATEGY_OPTIONS} value={bidStrategy} onChange={setBidStrategy} placeholder="Selecione" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Segmento do Negócio</Label>
                <CustomSelect options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} placeholder="Selecione" />
              </div>
            </div>

            {showBidFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">
                    {bidStrategy === "ROAS_MIN" ? "ROAS Mínimo" : "Custo Máx. por Resultado (R$)"}
                  </Label>
                  <Input
                    type="number"
                    value={maxCost}
                    onChange={(e) => setMaxCost(e.target.value)}
                    placeholder={bidStrategy === "ROAS_MIN" ? "Ex: 3.0" : "Ex: 25"}
                    className="h-8 text-xs rounded-lg"
                    min="0"
                    step={bidStrategy === "ROAS_MIN" ? "0.1" : "1"}
                  />
                </div>
                {bidStrategy === "BID_CAP" && (
                  <div className="space-y-1">
                    <Label className="text-[11px]">Valor do Lance (R$)</Label>
                    <Input
                      type="number"
                      value={bidValue}
                      onChange={(e) => setBidValue(e.target.value)}
                      placeholder="Ex: 10"
                      className="h-8 text-xs rounded-lg"
                      min="0"
                      step="0.5"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Block 3: Orçamento & Valor */}
          <div className="space-y-3 pt-3 border-t border-slate-50">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Orçamento & Valor</p>
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

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="w-full h-8 text-xs rounded-xl gap-1.5"
          >
            <Save className="h-3 w-3" />
            {isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </div>
      )}
    </div>
  );
}
