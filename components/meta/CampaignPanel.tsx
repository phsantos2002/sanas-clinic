"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { Zap, ZapOff, Play, Pause, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  updateCampaignStatus,
  getMetaAdSets,
  type MetaCampaignFull,
  type MetaAdSet,
  type MetaCampaignInsights,
} from "@/app/actions/meta";
import { fmtBrl, type Stage, scoreCtr, scoreCpm, scoreCpc } from "./shared";
import { CampaignThermometers } from "./CampaignThermometers";
import { CampaignAlerts } from "./CampaignAlerts";
import { AdSetItem } from "./AdSetList";
import { OptimizationTips } from "./OptimizationTips";
import { getBenchmark } from "@/lib/benchmarks";
import type { CampaignConfig } from "@/types";

type Props = {
  campaign: MetaCampaignFull;
  config: CampaignConfig | null;
  insights: MetaCampaignInsights | null;
  initialAdSets?: MetaAdSet[];
  pixelId: string | null;
  events: Array<{ name: string; count: number }>;
  stages: Stage[];
  userId?: string;
  onConfigChange?: (config: CampaignConfig) => void;
};

export function CampaignPanel({
  campaign, config: initialConfig, insights, initialAdSets,
  pixelId, events, stages, userId, onConfigChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(campaign.status);
  const [config] = useState(initialConfig);
  const [adSets, setAdSets] = useState<MetaAdSet[]>(initialAdSets ?? []);
  const [loadingAdSets, setLoadingAdSets] = useState(!initialAdSets);
  const isActive = status === "ACTIVE";

  const benchmark = useMemo(
    () => getBenchmark(config?.campaignObjective, config?.businessSegment),
    [config?.campaignObjective, config?.businessSegment]
  );

  useEffect(() => {
    if (!initialAdSets) {
      getMetaAdSets(campaign.id).then((data) => {
        setAdSets(data);
        setLoadingAdSets(false);
      });
    }
  }, [campaign.id, initialAdSets]);

  function handleToggleStatus() {
    const newStatus = isActive ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      const result = await updateCampaignStatus(campaign.id, newStatus);
      if (result.success) {
        setStatus(newStatus);
        toast.success(`Campanha ${newStatus === "ACTIVE" ? "ativada" : "pausada"}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  // Determine if bid strategy recommendation should show
  const shouldRecommendBidChange = useMemo(() => {
    if (!config) return null;
    const currentStrategy = config.bidStrategy ?? "LOWEST_COST";
    const cpcQ = scoreCpc(campaign.cpc, benchmark);
    const cpmQ = scoreCpm(campaign.cpm, benchmark);
    const ctrQ = scoreCtr(campaign.ctr, benchmark);

    // Recommend Cost Cap if on Lowest Cost and CPC is bad
    if (currentStrategy === "LOWEST_COST" && cpcQ === "bad" && cpmQ !== "good") {
      return { strategy: "Cost Cap", reason: "CPC alto sem limite — o Cost Cap controla o custo médio por resultado." };
    }
    // Recommend Bid Cap if CPC is bad even on Cost Cap
    if (currentStrategy === "COST_CAP" && cpcQ === "bad") {
      return { strategy: "Bid Cap", reason: "CPC acima do cap — o Bid Cap limita o lance máximo por clique." };
    }
    // Recommend back to Lowest Cost if everything is good on a restricted strategy
    if ((currentStrategy === "BID_CAP" || currentStrategy === "COST_CAP") && cpcQ === "good" && ctrQ === "good" && cpmQ === "good") {
      return { strategy: "Menor Custo", reason: "Performance excelente — voltar para Menor Custo pode aumentar a entrega." };
    }
    return null;
  }, [config, campaign, benchmark]);

  return (
    <div className="space-y-5">
      {/* [4] Campaign header + status + toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-bold text-slate-900">{campaign.name}</p>
          <p className="text-[10px] text-slate-400">ID: {campaign.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
            isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
            {isActive ? <Zap className="h-2.5 w-2.5" /> : <ZapOff className="h-2.5 w-2.5" />}
            {isActive ? "Ativa" : "Pausada"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleStatus}
            disabled={isPending}
            className="h-7 text-[10px] rounded-xl gap-1"
          >
            {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isActive ? "Pausar" : "Ativar"}
          </Button>
        </div>
      </div>

      {/* Bid Strategy Recommendation — only when thermometer suggests it */}
      {shouldRecommendBidChange && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
          <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          <span className="text-xs text-blue-800 flex-1">
            <span className="font-semibold">Considere usar {shouldRecommendBidChange.strategy}</span> — {shouldRecommendBidChange.reason}
          </span>
        </div>
      )}

      {/* Alerts */}
      {config && userId && (
        <CampaignAlerts
          campaign={campaign}
          config={config}
          benchmark={benchmark}
        />
      )}

      {/* [5] Thermometers — up high */}
      <CampaignThermometers campaign={campaign} config={config} />

      {/* [6] Ad Sets & Creatives */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-blue-500" />
          Conjuntos de Anúncios & Criativos
        </h3>
        {loadingAdSets ? (
          <p className="text-[10px] text-slate-400 py-4 text-center">Carregando conjuntos...</p>
        ) : adSets.length === 0 ? (
          <Card className="border-slate-100 rounded-2xl">
            <CardContent className="py-6 text-center">
              <p className="text-xs text-slate-400">Nenhum conjunto de anúncios encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {adSets.map((adSet) => (
              <AdSetItem
                key={adSet.id}
                adSet={adSet}
                campaignCpc={campaign.cpc}
                campaignCpm={campaign.cpm}
                benchmark={benchmark}
              />
            ))}
          </div>
        )}
      </div>

      {/* Optimization Tips */}
      <OptimizationTips campaign={campaign} insights={insights} />

      {/* Pixel Events */}
      {events.length > 0 && (
        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-blue-500" />
              Eventos do Pixel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-slate-400 mb-3">
              Eventos enviados quando leads mudam de estágio.
              {pixelId && <span className="ml-1">Pixel: <span className="font-mono text-slate-600">{pixelId}</span></span>}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {events.map((event) => {
                const stage = stages.find((s) => s.eventName === event.name);
                return (
                  <div key={event.name} className="bg-slate-50 rounded-xl p-2 space-y-0.5">
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">{stage?.name ?? event.name}</p>
                    <p className="text-[10px] font-mono text-blue-600">{event.name}</p>
                    <p className="text-xs font-bold text-slate-900">{event.count}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
