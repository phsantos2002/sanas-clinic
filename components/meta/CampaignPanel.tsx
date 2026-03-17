"use client";

import { useState, useTransition, useEffect, useMemo, useRef, useCallback } from "react";
import { Zap, ZapOff, Play, Pause, Send, AlertTriangle, ArrowDown } from "lucide-react";
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
import { fmtBrl, type Stage } from "./shared";
import { CampaignThermometers } from "./CampaignThermometers";
import { CampaignConfigPanel } from "./CampaignConfigPanel";
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
  const [config, setConfig] = useState(initialConfig);
  const [adSets, setAdSets] = useState<MetaAdSet[]>(initialAdSets ?? []);
  const [loadingAdSets, setLoadingAdSets] = useState(!initialAdSets);
  const [forceExpandConfig, setForceExpandConfig] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);
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

  const handleConfigSaved = useCallback((newConfig: CampaignConfig) => {
    setConfig(newConfig);
    setForceExpandConfig(false);
    onConfigChange?.(newConfig);
  }, [onConfigChange]);

  function scrollToConfig() {
    setForceExpandConfig(true);
    setTimeout(() => {
      configRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

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

      {/* Banner "não configurado" — compact */}
      {!config && (
        <button
          onClick={scrollToConfig}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-left hover:bg-amber-100/60 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-800 flex-1">
            Configure esta campanha para personalizar os termômetros e alertas
          </span>
          <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5 flex-shrink-0">
            Configurar <ArrowDown className="h-3 w-3" />
          </span>
        </button>
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

      {/* [7] Config panel — LAST section */}
      <div ref={configRef}>
        <CampaignConfigPanel
          campaignId={campaign.id}
          campaignName={campaign.name}
          config={config}
          onSaved={handleConfigSaved}
          forceExpanded={forceExpandConfig}
        />
      </div>
    </div>
  );
}
