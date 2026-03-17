"use client";

import { useState, useTransition } from "react";
import { Zap, ZapOff, Play, Pause, AlertCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetaIcon } from "@/components/icons/SourceIcons";
import { toast } from "sonner";
import { updateCampaignStatus, type MetaCampaignFull, type MetaAdSet, type MetaCampaignInsights } from "@/app/actions/meta";
import { resolveAlert, generateAlerts } from "@/app/actions/alerts";
import { fmtBrl, type Stage } from "./shared";
import { AccountPhaseCard } from "./AccountPhaseCard";
import { AlertsPanel, type Alert } from "./AlertsPanel";
import { CampaignKPIs } from "./CampaignKPIs";
import { AdSetItem } from "./AdSetList";
import { OptimizationTips } from "./OptimizationTips";
import { CampaignObjectiveWizard } from "./CampaignObjectiveWizard";

type Props = {
  campaigns: MetaCampaignFull[];
  hasConfig: boolean;
  pixelId: string | null;
  events: Array<{ name: string; count: number }>;
  stages: Stage[];
  selectedCampaign: MetaCampaignFull | null;
  selectedAdSets: MetaAdSet[];
  selectedInsights: MetaCampaignInsights | null;
  selectedCampaignId: string | null;
  apiError?: string;
  accountPhase?: string | null;
  bidStrategy?: string | null;
  conversionDestination?: string | null;
  campaignObjective?: string | null;
  userId?: string;
  initialAlerts?: Alert[];
};

type Phase = "LEARNING" | "STABILIZING" | "SCALING" | "MATURE";
const VALID_PHASES = new Set<string>(["LEARNING", "STABILIZING", "SCALING", "MATURE"]);
function toPhase(val: string | null | undefined): Phase | null {
  return val && VALID_PHASES.has(val) ? (val as Phase) : null;
}

export function MetaPageClient({
  campaigns, hasConfig, pixelId, events, stages,
  selectedCampaign, selectedAdSets, selectedInsights, selectedCampaignId, apiError,
  accountPhase, bidStrategy, conversionDestination, campaignObjective, userId, initialAlerts,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [campaignStatus, setCampaignStatus] = useState(selectedCampaign?.status ?? "PAUSED");
  const [wizardDone, setWizardDone] = useState(false);
  const isActive = campaignStatus === "ACTIVE";
  const showWizard = !campaignObjective && !wizardDone && hasConfig && !!selectedCampaignId && !!selectedCampaign;

  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={20} /> Meta Ads</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <Card className="border-slate-100 rounded-2xl">
          <CardContent className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto"><MetaIcon size={28} /></div>
            <p className="text-sm font-semibold text-slate-700">Conecte sua conta Meta Ads</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Configure o Ad Account ID e o Token de Acesso em<br />
              <span className="font-medium text-indigo-600">Configurações &rarr; Pixel do Facebook</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedCampaignId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={20} /> Meta Ads</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <Card className="border-amber-100 bg-amber-50/30 rounded-2xl">
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-900">Selecione uma campanha principal</p>
            <p className="text-xs text-amber-700/70 max-w-md mx-auto">
              Vá em <span className="font-medium">Configurações &rarr; Campanha Principal</span> e escolha
              qual campanha deseja gerenciar aqui.
            </p>
            {campaigns.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {campaigns.length} campanha{campaigns.length > 1 ? "s" : ""} disponíve{campaigns.length > 1 ? "is" : "l"} na sua conta.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedCampaign) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={20} /> Meta Ads</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <Card className="border-red-100 bg-red-50/30 rounded-2xl">
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-red-900">Erro ao carregar campanha</p>
            <p className="text-xs text-red-700/70 max-w-md mx-auto">
              A campanha selecionada (ID: <span className="font-mono">{selectedCampaignId}</span>) não pôde ser carregada.
            </p>
            {apiError && (
              <p className="text-xs font-mono text-red-600 bg-red-100 rounded-lg px-3 py-2 max-w-lg mx-auto break-all">
                {apiError}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Vá em <span className="font-medium">Configurações &rarr; Pixel do Facebook</span> para verificar o token,
              ou selecione outra campanha em <span className="font-medium">Configurações &rarr; Campanha Principal</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleToggleStatus() {
    const newStatus = isActive ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      const result = await updateCampaignStatus(selectedCampaign!.id, newStatus);
      if (result.success) { setCampaignStatus(newStatus); toast.success(`Campanha ${newStatus === "ACTIVE" ? "ativada" : "pausada"}`); }
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={20} /> Meta Ads</h1>
          <p className="text-sm text-slate-400 mt-1">Campanha: <span className="font-medium text-slate-700">{selectedCampaign.name}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {isActive ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
            {isActive ? "Ativa" : "Pausada"}
          </span>
          <Button size="sm" variant="outline" onClick={handleToggleStatus} disabled={isPending} className="h-8 text-xs rounded-xl gap-1.5">
            {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isActive ? "Pausar" : "Ativar"}
          </Button>
        </div>
      </div>

      {/* Onboarding Wizard */}
      {showWizard && (
        <CampaignObjectiveWizard onComplete={() => setWizardDone(true)} />
      )}

      {/* Account Phase */}
      {userId && (
        <AccountPhaseCard
          userId={userId}
          initialPhase={toPhase(accountPhase)}
          initialBidStrategy={bidStrategy ?? null}
          conversionDestination={conversionDestination ?? null}
        />
      )}

      {/* Alerts */}
      <AlertsPanel
        initialAlerts={initialAlerts ?? []}
        onResolve={resolveAlert}
        onRefresh={userId ? async () => {
          const result = await generateAlerts(userId);
          return result.alerts;
        } : undefined}
      />

      {/* Campaign KPIs, Quality, Budget, Bid Cap */}
      <CampaignKPIs campaign={selectedCampaign} />

      {/* Ad Sets & Creatives */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-blue-500" />
          Conjuntos de Anúncios & Criativos
        </h2>
        {selectedAdSets.length === 0 ? (
          <Card className="border-slate-100 rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-slate-400">Nenhum conjunto de anúncios encontrado nesta campanha.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedAdSets.map((adSet) => (
              <AdSetItem key={adSet.id} adSet={adSet} campaignCpc={selectedCampaign.cpc} campaignCpm={selectedCampaign.cpm} />
            ))}
          </div>
        )}
      </div>

      {/* Creative Strategy */}
      <OptimizationTips campaign={selectedCampaign} insights={selectedInsights} />

      {/* Pixel Events */}
      <Card className="border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-500" />
            Eventos do Pixel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400 mb-4">
            Eventos enviados automaticamente quando leads mudam de estágio.
            {pixelId && <span className="ml-1">Pixel: <span className="font-mono text-slate-600">{pixelId}</span></span>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {events.map((event) => {
              const stage = stages.find((s) => s.eventName === event.name);
              return (
                <div key={event.name} className="bg-slate-50 rounded-xl p-3 space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{stage?.name ?? event.name}</p>
                  <p className="text-xs font-mono text-blue-600">{event.name}</p>
                  <p className="text-sm font-bold text-slate-900">{event.count} <span className="text-[10px] text-slate-400 font-normal">últimos 30d</span></p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Other campaigns overview */}
      {campaigns.length > 1 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">Outras campanhas na conta</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {campaigns.filter((c) => c.id !== selectedCampaignId).map((c) => (
              <div key={c.id} className="bg-white border border-slate-100 rounded-xl p-3">
                <p className="text-xs font-medium text-slate-700 truncate">{c.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {c.status === "ACTIVE" ? "Ativa" : "Pausada"}
                  </span>
                  <span className="text-[10px] text-slate-400">{fmtBrl(c.spend)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
