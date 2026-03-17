"use client";

import { useState, useCallback } from "react";
import { AlertCircle, Plus, PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetaIcon } from "@/components/icons/SourceIcons";
import type { MetaCampaignFull, MetaAdSet, MetaCampaignInsights } from "@/app/actions/meta";
import type { CampaignConfig } from "@/types";
import { type Stage } from "./shared";
import { CampaignTabs } from "./CampaignTabs";
import { CampaignPanel } from "./CampaignPanel";
import { AccountPhaseCard } from "./AccountPhaseCard";

type Phase = "LEARNING" | "STABILIZING" | "SCALING" | "MATURE";
const VALID_PHASES = new Set<string>(["LEARNING", "STABILIZING", "SCALING", "MATURE"]);
function toPhase(val: string | null | undefined): Phase | null {
  return val && VALID_PHASES.has(val) ? (val as Phase) : null;
}

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
  userId?: string;
  campaignConfigs?: CampaignConfig[];
};

export function MetaPageClient({
  campaigns, hasConfig, pixelId, events, stages,
  selectedCampaign, selectedAdSets, selectedInsights, selectedCampaignId, apiError,
  accountPhase, bidStrategy, conversionDestination,
  userId, campaignConfigs: initialConfigs,
}: Props) {
  const [configMap, setConfigMap] = useState<Record<string, CampaignConfig>>(() => {
    const map: Record<string, CampaignConfig> = {};
    for (const cfg of initialConfigs ?? []) {
      map[cfg.campaignId] = cfg;
    }
    return map;
  });

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(() => {
    if (selectedCampaignId && campaigns.some((c) => c.id === selectedCampaignId)) return selectedCampaignId;
    const active = campaigns.find((c) => c.status === "ACTIVE");
    return active?.id ?? campaigns[0]?.id ?? null;
  });

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;
  const activeConfig = activeCampaignId ? configMap[activeCampaignId] ?? null : null;
  const isPreFetched = activeCampaignId === selectedCampaignId;
  const currentAdSets = isPreFetched ? selectedAdSets : undefined;
  const currentInsights = isPreFetched ? selectedInsights : null;

  const allPaused = campaigns.length > 0 && campaigns.every((c) => c.status !== "ACTIVE");

  const handleConfigChange = useCallback((config: CampaignConfig) => {
    setConfigMap((prev) => ({ ...prev, [config.campaignId]: config }));
  }, []);

  // ─── Not configured ───
  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <Header />
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

  // ─── No campaigns (Correção 8) ───
  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-slate-100 rounded-2xl">
          <CardContent className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
              <MetaIcon size={32} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhuma campanha encontrada</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Verifique se o token de acesso tem permissão <span className="font-mono">ads_read</span> e
              se a conta de anúncios está correta em <span className="font-medium text-indigo-600">Configurações</span>.
            </p>
            {apiError && (
              <p className="text-xs font-mono text-red-600 bg-red-50 rounded-lg px-3 py-2 max-w-lg mx-auto break-all">
                {apiError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* [1] Header */}
      <Header />

      {/* [2] Account Phase — compact banner */}
      {userId && (
        <AccountPhaseCard
          userId={userId}
          initialPhase={toPhase(accountPhase)}
          initialBidStrategy={bidStrategy ?? null}
          conversionDestination={conversionDestination ?? null}
        />
      )}

      {/* Banner: all campaigns paused (Correção 8) */}
      {allPaused && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
          <PauseCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-800">
            Todas as suas campanhas estão pausadas. Ative uma para começar a anunciar.
          </span>
        </div>
      )}

      {/* [3] Campaign tabs */}
      <CampaignTabs
        campaigns={campaigns}
        configs={configMap}
        activeCampaignId={activeCampaignId}
        onSelect={setActiveCampaignId}
      />

      {/* Active campaign panel */}
      {activeCampaign ? (
        <CampaignPanel
          key={activeCampaignId}
          campaign={activeCampaign}
          config={activeConfig}
          insights={currentInsights}
          initialAdSets={currentAdSets}
          pixelId={pixelId}
          events={events}
          stages={stages}
          userId={userId}
          onConfigChange={handleConfigChange}
        />
      ) : (
        <Card className="border-slate-100 rounded-2xl">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-slate-400">Selecione uma campanha acima para ver os detalhes.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
          <MetaIcon size={20} /> Meta Ads
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Gerencie campanhas, métricas e criativos</p>
      </div>
      <Button
        size="sm"
        className="h-8 text-xs rounded-xl gap-1.5"
        onClick={() => window.open("https://business.facebook.com/adsmanager/manage/campaigns?act=", "_blank")}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Nova Campanha</span>
      </Button>
    </div>
  );
}
