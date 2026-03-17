"use client";

import { useState, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MetaIcon } from "@/components/icons/SourceIcons";
import type { MetaCampaignFull, MetaAdSet, MetaCampaignInsights } from "@/app/actions/meta";
import type { CampaignConfig } from "@/types";
import { fmtBrl, type Stage } from "./shared";
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
  // Selected campaign data (pre-fetched for the initially selected one)
  selectedCampaign: MetaCampaignFull | null;
  selectedAdSets: MetaAdSet[];
  selectedInsights: MetaCampaignInsights | null;
  selectedCampaignId: string | null;
  apiError?: string;
  // Global config
  accountPhase?: string | null;
  bidStrategy?: string | null;
  conversionDestination?: string | null;
  userId?: string;
  // Per-campaign configs
  campaignConfigs?: CampaignConfig[];
};

export function MetaPageClient({
  campaigns, hasConfig, pixelId, events, stages,
  selectedCampaign, selectedAdSets, selectedInsights, selectedCampaignId, apiError,
  accountPhase, bidStrategy, conversionDestination,
  userId, campaignConfigs: initialConfigs,
}: Props) {
  // Build config map: campaignId → CampaignConfig
  const [configMap, setConfigMap] = useState<Record<string, CampaignConfig>>(() => {
    const map: Record<string, CampaignConfig> = {};
    for (const cfg of initialConfigs ?? []) {
      map[cfg.campaignId] = cfg;
    }
    return map;
  });

  // Active campaign ID — defaults to the selected one or first active campaign
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(() => {
    if (selectedCampaignId && campaigns.some((c) => c.id === selectedCampaignId)) return selectedCampaignId;
    const active = campaigns.find((c) => c.status === "ACTIVE");
    return active?.id ?? campaigns[0]?.id ?? null;
  });

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;
  const activeConfig = activeCampaignId ? configMap[activeCampaignId] ?? null : null;

  // For the initially selected campaign, we have pre-fetched adSets and insights
  const isPreFetched = activeCampaignId === selectedCampaignId;
  const currentAdSets = isPreFetched ? selectedAdSets : undefined;
  const currentInsights = isPreFetched ? selectedInsights : null;

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

  // ─── No campaigns ───
  if (campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-amber-100 bg-amber-50/30 rounded-2xl">
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-900">Nenhuma campanha encontrada</p>
            <p className="text-xs text-amber-700/70 max-w-md mx-auto">
              Verifique se o token de acesso tem permissão <span className="font-mono">ads_read</span> e
              se a conta de anúncios está correta em <span className="font-medium">Configurações</span>.
            </p>
            {apiError && (
              <p className="text-xs font-mono text-red-600 bg-red-100 rounded-lg px-3 py-2 max-w-lg mx-auto break-all">
                {apiError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Account Phase */}
      {userId && (
        <AccountPhaseCard
          userId={userId}
          initialPhase={toPhase(accountPhase)}
          initialBidStrategy={bidStrategy ?? null}
          conversionDestination={conversionDestination ?? null}
        />
      )}

      {/* Campaign tabs */}
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

      {/* Other campaigns summary */}
      {campaigns.length > 1 && activeCampaignId && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400">Outras campanhas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {campaigns.filter((c) => c.id !== activeCampaignId).map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCampaignId(c.id)}
                className="bg-white border border-slate-100 rounded-xl p-3 text-left hover:border-indigo-200 transition-colors"
              >
                <p className="text-xs font-medium text-slate-700 truncate">{c.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                    c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.status === "ACTIVE" ? "Ativa" : "Pausada"}
                  </span>
                  <span className="text-[10px] text-slate-400">{fmtBrl(c.spend)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
        <MetaIcon size={20} /> Meta Ads
      </h1>
      <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, métricas e criativos</p>
    </div>
  );
}
