"use client";

import { useState, useTransition } from "react";
import {
  Zap, ZapOff, DollarSign, Eye, MousePointerClick, Users,
  ChevronDown, ChevronRight, Play, Pause, Target,
  Image as ImageIcon, Settings2, Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetaIcon } from "@/components/icons/SourceIcons";
import { toast } from "sonner";
import {
  updateCampaignStatus,
  updateCampaignBudget,
  updateAdSetBidCap,
  getMetaAdSets,
  getMetaAds,
  updateAdStatus,
  type MetaCampaignFull,
  type MetaAdSet,
  type MetaAd,
} from "@/app/actions/meta";

type Stage = { id: string; name: string; eventName: string };

type Props = {
  campaigns: MetaCampaignFull[];
  hasConfig: boolean;
  pixelId: string | null;
  events: Array<{ name: string; count: number }>;
  stages: Stage[];
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBrl(n: number) {
  return `R$ ${fmt(n)}`;
}

const BID_STRATEGIES: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP: "Menor Custo",
  LOWEST_COST_WITH_BID_CAP: "Bid Cap",
  COST_CAP: "Cost Cap",
  LOWEST_COST_WITH_MIN_ROAS: "ROAS Mínimo",
};

const OBJECTIVES: Record<string, string> = {
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

// ─── Campaign Row ───

function CampaignRow({ campaign }: { campaign: MetaCampaignFull }) {
  const [expanded, setExpanded] = useState(false);
  const [adSets, setAdSets] = useState<MetaAdSet[]>([]);
  const [loadingAdSets, setLoadingAdSets] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editBudget, setEditBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(
    campaign.dailyBudget?.toString() ?? ""
  );
  const [status, setStatus] = useState(campaign.status);
  const isActive = status === "ACTIVE";

  async function handleToggleStatus() {
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

  async function handleSaveBudget() {
    const val = parseFloat(budgetValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Valor inválido");
      return;
    }
    startTransition(async () => {
      const result = await updateCampaignBudget(campaign.id, val);
      if (result.success) {
        toast.success("Orçamento atualizado");
        setEditBudget(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (adSets.length === 0) {
      setLoadingAdSets(true);
      const sets = await getMetaAdSets(campaign.id);
      setAdSets(sets);
      setLoadingAdSets(false);
    }
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${isActive ? "border-blue-200" : "border-slate-100"}`}>
      {/* Campaign header */}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={handleExpand} className="text-slate-400 hover:text-slate-600 transition-colors">
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{campaign.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">
                  {OBJECTIVES[campaign.objective] ?? campaign.objective}
                </span>
                {campaign.bidStrategy && (
                  <>
                    <span className="text-slate-200">·</span>
                    <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium">
                      {BID_STRATEGIES[campaign.bidStrategy] ?? campaign.bidStrategy}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
              isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
              {isActive ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
              {isActive ? "Ativa" : "Pausada"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleStatus}
              disabled={isPending}
              className="h-8 text-xs rounded-xl gap-1.5"
            >
              {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isActive ? "Pausar" : "Ativar"}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-3 mt-4">
          {[
            { label: "Gasto", value: fmtBrl(campaign.spend), icon: DollarSign },
            { label: "Impressões", value: campaign.impressions.toLocaleString("pt-BR"), icon: Eye },
            { label: "Cliques", value: campaign.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
            { label: "Alcance", value: campaign.reach.toLocaleString("pt-BR"), icon: Users },
            { label: "CTR", value: `${fmt(campaign.ctr)}%`, icon: Target },
            { label: "CPM", value: fmtBrl(campaign.cpm), icon: DollarSign },
            { label: "CPC", value: fmtBrl(campaign.cpc), icon: MousePointerClick },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-50 rounded-xl p-2.5">
              <div className="flex items-center gap-1 mb-0.5">
                <kpi.icon className="h-3 w-3 text-slate-400" />
                <p className="text-[10px] text-slate-400">{kpi.label}</p>
              </div>
              <p className="text-xs font-bold text-slate-900">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Budget edit */}
        <div className="flex items-center gap-3 mt-3">
          <p className="text-xs text-slate-500">
            Orçamento diário: <span className="font-semibold text-slate-900">
              {campaign.dailyBudget != null ? fmtBrl(campaign.dailyBudget) : "Não definido"}
            </span>
          </p>
          {!editBudget ? (
            <button
              onClick={() => setEditBudget(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Alterar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                className="h-7 w-28 text-xs rounded-lg"
                placeholder="R$"
              />
              <Button size="sm" onClick={handleSaveBudget} disabled={isPending} className="h-7 text-xs rounded-lg">
                Salvar
              </Button>
              <button onClick={() => setEditBudget(false)} className="text-xs text-slate-400 hover:text-slate-600">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded: Ad Sets */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conjuntos de Anúncios</p>
          {loadingAdSets ? (
            <p className="text-xs text-slate-400">Carregando...</p>
          ) : adSets.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum conjunto encontrado</p>
          ) : (
            adSets.map((adSet) => (
              <AdSetRow key={adSet.id} adSet={adSet} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── AdSet Row ───

function AdSetRow({ adSet }: { adSet: MetaAdSet }) {
  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editBidCap, setEditBidCap] = useState(false);
  const [bidValue, setBidValue] = useState(adSet.bidAmount?.toString() ?? "");
  const isActive = adSet.status === "ACTIVE";

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (ads.length === 0) {
      setLoadingAds(true);
      const fetchedAds = await getMetaAds(adSet.id);
      setAds(fetchedAds);
      setLoadingAds(false);
    }
  }

  async function handleSaveBidCap() {
    const val = parseFloat(bidValue);
    if (isNaN(val) || val <= 0) {
      toast.error("Valor inválido");
      return;
    }
    startTransition(async () => {
      const result = await updateAdSetBidCap(adSet.id, val);
      if (result.success) {
        toast.success("Bid Cap atualizado");
        setEditBidCap(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${isActive ? "border-blue-100" : "border-slate-100"}`}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={handleExpand} className="text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{adSet.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {isActive ? "Ativo" : "Pausado"}
                </span>
                {adSet.optimization_goal && (
                  <span className="text-[10px] text-slate-400">
                    Otimização: {adSet.optimization_goal.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bid Cap */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Bid Cap</p>
              <p className="text-xs font-bold text-slate-900">
                {adSet.bidAmount != null ? fmtBrl(adSet.bidAmount) : "—"}
              </p>
            </div>
            {!editBidCap ? (
              <button
                onClick={() => setEditBidCap(true)}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Editar
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={bidValue}
                  onChange={(e) => setBidValue(e.target.value)}
                  className="h-6 w-20 text-[11px] rounded-md"
                  placeholder="R$"
                />
                <Button size="sm" onClick={handleSaveBidCap} disabled={isPending} className="h-6 text-[10px] rounded-md px-2">
                  OK
                </Button>
                <button onClick={() => setEditBidCap(false)} className="text-[10px] text-slate-400">✕</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ads */}
      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/30 px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" /> Criativos / Anúncios
          </p>
          {loadingAds ? (
            <p className="text-[10px] text-slate-400">Carregando...</p>
          ) : ads.length === 0 ? (
            <p className="text-[10px] text-slate-400">Nenhum anúncio encontrado</p>
          ) : (
            ads.map((ad) => <AdRow key={ad.id} ad={ad} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ad Row ───

function AdRow({ ad }: { ad: MetaAd }) {
  const [status, setStatus] = useState(ad.status);
  const [isPending, startTransition] = useTransition();
  const isActive = status === "ACTIVE";

  async function handleToggle() {
    const newStatus = isActive ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      const result = await updateAdStatus(ad.id, newStatus);
      if (result.success) {
        setStatus(newStatus);
        toast.success(`Anúncio ${newStatus === "ACTIVE" ? "ativado" : "pausado"}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between bg-white rounded-lg border border-slate-100 p-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {ad.thumbnailUrl ? (
          <img src={ad.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-slate-400" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-800 truncate">{ad.name}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
            isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>
            {isActive ? "Ativo" : "Pausado"}
          </span>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleToggle}
        disabled={isPending}
        className="h-7 text-[10px] rounded-lg gap-1"
      >
        {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {isActive ? "Pausar" : "Ativar"}
      </Button>
    </div>
  );
}

// ─── Main Component ───

export function MetaPageClient({ campaigns, hasConfig, pixelId, events, stages }: Props) {
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const pausedCampaigns = campaigns.filter((c) => c.status !== "ACTIVE");
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MetaIcon size={24} /> Meta Ads
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <Card className="border-slate-100 rounded-2xl">
          <CardContent className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
              <MetaIcon size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Conecte sua conta Meta Ads</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Configure o Ad Account ID e o Token de Acesso em<br />
              <span className="font-medium text-indigo-600">Configurações → Pixel do Facebook</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MetaIcon size={24} /> Meta Ads
          </h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <div className="flex items-center gap-2">
          {activeCampaigns.length > 0 && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              {activeCampaigns.length} campanha{activeCampaigns.length > 1 ? "s" : ""} ativa{activeCampaigns.length > 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full">
            Gasto total: {fmtBrl(totalSpend)}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Campanhas", value: campaigns.length.toString(), icon: Settings2, bg: "bg-blue-50", color: "text-blue-600" },
          { label: "Ativas", value: activeCampaigns.length.toString(), icon: Zap, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Gasto Total", value: fmtBrl(totalSpend), icon: DollarSign, bg: "bg-red-50", color: "text-red-600" },
          { label: "Cliques Total", value: campaigns.reduce((s, c) => s + c.clicks, 0).toLocaleString("pt-BR"), icon: MousePointerClick, bg: "bg-amber-50", color: "text-amber-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Pixel Events Section */}
      <Card className="border-slate-100 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="h-4 w-4 text-blue-500" />
            Eventos do Pixel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400 mb-4">
            Eventos enviados automaticamente quando leads mudam de estágio no pipeline.
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
          <p className="text-[10px] text-slate-400 mt-3">
            Para configurar quais eventos cada estágio dispara, vá em Configurações → Colunas do Pipeline.
          </p>
        </CardContent>
      </Card>

      {/* Bid Cap Strategy Info */}
      <Card className="border-blue-100 bg-blue-50/30 rounded-2xl shadow-sm">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">Estratégia Bid Cap</p>
              <p className="text-xs text-blue-700/70 mt-1 leading-relaxed">
                O Bid Cap limita o valor máximo que a Meta pode dar lance por resultado.
                Para usar, expanda a campanha desejada, abra o conjunto de anúncios e defina o valor do Bid Cap.
                A estratégia será aplicada como <span className="font-medium">LOWEST_COST_WITH_BID_CAP</span>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-blue-500" />
          Campanhas
        </h2>

        {campaigns.length === 0 ? (
          <Card className="border-slate-100 rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-slate-400">Nenhuma campanha encontrada nesta conta.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Active first */}
            {activeCampaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} />
            ))}
            {pausedCampaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
