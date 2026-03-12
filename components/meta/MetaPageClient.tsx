"use client";

import { useState, useTransition } from "react";
import {
  Zap, ZapOff, DollarSign, Eye, MousePointerClick, Users,
  ChevronDown, ChevronRight, Play, Pause, Target,
  Image as ImageIcon, Send, AlertCircle, Plus, Lightbulb,
  TrendingUp, TrendingDown, Activity, TriangleAlert, Info,
  ExternalLink, Sparkles,
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
  getMetaAds,
  updateAdStatus,
  type MetaCampaignFull,
  type MetaAdSet,
  type MetaAd,
  type MetaCampaignInsights,
} from "@/app/actions/meta";

type Stage = { id: string; name: string; eventName: string };

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

type Quality = "good" | "ok" | "bad";
function scoreCTR(ctr: number): Quality { return ctr >= 1.5 ? "good" : ctr >= 0.5 ? "ok" : "bad"; }
function scoreCPM(cpm: number): Quality { return cpm <= 20 ? "good" : cpm <= 50 ? "ok" : "bad"; }
function scoreCPC(cpc: number): Quality { return cpc <= 2 ? "good" : cpc <= 5 ? "ok" : "bad"; }

const qualityConfig: Record<Quality, { label: string; color: string; bar: string }> = {
  good: { label: "Ótimo", color: "text-emerald-600", bar: "bg-emerald-500" },
  ok:   { label: "Regular", color: "text-amber-600", bar: "bg-amber-400" },
  bad:  { label: "Fraco", color: "text-red-500", bar: "bg-red-400" },
};

function Thermometer({ label, value, quality }: { label: string; value: string; quality: Quality }) {
  const cfg = qualityConfig[quality];
  const barWidth = quality === "good" ? 100 : quality === "ok" ? 60 : 25;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

// ─── Creative Health ───

type CreativeHealth = "performing" | "saturating" | "declining" | "paused" | "new";

function getCreativeHealth(ad: MetaAd): CreativeHealth {
  if (ad.status !== "ACTIVE") return "paused";
  if (ad.impressions === 0) return "new";
  // Frequency > 4 = audience is seeing the ad too many times
  if (ad.frequency >= 4) return "declining";
  // Frequency > 2.5 with bad CTR = starting to saturate
  if (ad.frequency >= 2.5 && ad.ctr < 0.8) return "saturating";
  // Bad CTR alone
  if (ad.ctr < 0.3 && ad.impressions > 1000) return "declining";
  return "performing";
}

const healthConfig: Record<CreativeHealth, { label: string; color: string; bg: string; icon: typeof TrendingUp; tip: string }> = {
  performing: { label: "Performando", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: TrendingUp, tip: "Criativo com bom desempenho. Mantenha ativo." },
  saturating: { label: "Saturando", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Activity, tip: "Frequência alta e CTR caindo. Prepare um criativo substituto." },
  declining:  { label: "Esgotar/Pausar", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: TrendingDown, tip: "Frequência muito alta ou CTR muito baixo. Considere pausar e substituir." },
  paused:     { label: "Pausado", color: "text-slate-500", bg: "bg-slate-50 border-slate-200", icon: Pause, tip: "Criativo pausado." },
  new:        { label: "Novo", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Sparkles, tip: "Sem dados suficientes ainda. Aguarde 2-3 dias para avaliar." },
};

// ─── AdSet Row ───

function AdSetRow({ adSet, campaignCpc, campaignCpm }: { adSet: MetaAdSet; campaignCpc: number; campaignCpm: number }) {
  const [expanded, setExpanded] = useState(false);
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editBidCap, setEditBidCap] = useState(false);
  const [bidValue, setBidValue] = useState(adSet.bidAmount?.toString() ?? "");
  const isActive = adSet.status === "ACTIVE";

  // Bid cap guidance based on campaign CPC
  const suggestedBidMin = campaignCpc > 0 ? Math.max(0.01, campaignCpc * 0.8) : null;
  const suggestedBidMax = campaignCpc > 0 ? campaignCpc * 1.5 : null;

  async function handleExpand() {
    if (expanded) { setExpanded(false); return; }
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
    if (isNaN(val) || val <= 0) { toast.error("Valor inválido"); return; }
    startTransition(async () => {
      const result = await updateAdSetBidCap(adSet.id, val);
      if (result.success) { toast.success("Bid Cap atualizado"); setEditBidCap(false); }
      else toast.error(result.error);
    });
  }

  const activeAds = ads.filter((a) => a.status === "ACTIVE");
  const performingCount = ads.filter((a) => getCreativeHealth(a) === "performing").length;
  const warningCount = ads.filter((a) => ["saturating", "declining"].includes(getCreativeHealth(a))).length;

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
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {isActive ? "Ativo" : "Pausado"}
                </span>
                {adSet.optimization_goal && (
                  <span className="text-[10px] text-slate-400">Otimização: {adSet.optimization_goal.replace(/_/g, " ")}</span>
                )}
                {ads.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {activeAds.length} ativo{activeAds.length !== 1 ? "s" : ""}
                    {warningCount > 0 && <span className="text-amber-500 ml-1">({warningCount} atenção)</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Bid Cap</p>
              <p className="text-xs font-bold text-slate-900">{adSet.bidAmount != null ? fmtBrl(adSet.bidAmount) : "—"}</p>
            </div>
            {!editBidCap ? (
              <button onClick={() => setEditBidCap(true)} className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">Editar</button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input type="number" value={bidValue} onChange={(e) => setBidValue(e.target.value)} className="h-6 w-20 text-[11px] rounded-md" placeholder="R$" />
                <Button size="sm" onClick={handleSaveBidCap} disabled={isPending} className="h-6 text-[10px] rounded-md px-2">OK</Button>
                <button onClick={() => setEditBidCap(false)} className="text-[10px] text-slate-400">✕</button>
              </div>
            )}
          </div>
        </div>

        {/* Bid cap suggestion inline */}
        {editBidCap && suggestedBidMin != null && suggestedBidMax != null && (
          <div className="mt-2 ml-6 flex items-start gap-1.5 text-[10px] text-blue-600 bg-blue-50 rounded-lg px-2.5 py-1.5">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>
              Com base no CPC médio ({fmtBrl(campaignCpc)}), sugerimos um bid entre{" "}
              <span className="font-bold">{fmtBrl(suggestedBidMin)}</span> e{" "}
              <span className="font-bold">{fmtBrl(suggestedBidMax)}</span>.
              Valores abaixo podem limitar entrega; acima aumentam custo sem ganho proporcional.
            </span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/30 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> Criativos / Anúncios
            </p>
            <a
              href={`https://www.facebook.com/adsmanager/manage/ads?act=${adSet.campaignId}&selected_adset_ids=${adSet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus className="h-3 w-3" /> Adicionar criativo
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

          {loadingAds ? (
            <p className="text-[10px] text-slate-400">Carregando...</p>
          ) : ads.length === 0 ? (
            <p className="text-[10px] text-slate-400">Nenhum anúncio encontrado</p>
          ) : (
            <div className="space-y-2">
              {ads.map((ad) => <AdRow key={ad.id} ad={ad} />)}

              {/* Summary bar */}
              {ads.length > 1 && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">{ads.length} criativos</span>
                  {performingCount > 0 && <span className="text-[10px] text-emerald-600">{performingCount} performando</span>}
                  {warningCount > 0 && <span className="text-[10px] text-amber-600">{warningCount} precisam de atenção</span>}
                </div>
              )}
            </div>
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
  const health = getCreativeHealth({ ...ad, status });
  const hCfg = healthConfig[health];
  const HealthIcon = hCfg.icon;

  async function handleToggle() {
    const newStatus = isActive ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      const result = await updateAdStatus(ad.id, newStatus);
      if (result.success) { setStatus(newStatus); toast.success(`Anúncio ${newStatus === "ACTIVE" ? "ativado" : "pausado"}`); }
      else toast.error(result.error);
    });
  }

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${hCfg.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {ad.thumbnailUrl ? (
            <img src={ad.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-slate-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-800 truncate">{ad.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${hCfg.color}`}>
                <HealthIcon className="h-3 w-3" />
                {hCfg.label}
              </span>
              {ad.impressions > 0 && (
                <span className="text-[10px] text-slate-400">Freq: {fmt(ad.frequency, 1)}x</span>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={isPending} className="h-7 text-[10px] rounded-lg gap-1 bg-white/80">
          {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isActive ? "Pausar" : "Ativar"}
        </Button>
      </div>

      {/* Mini KPIs for ad */}
      {ad.impressions > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Gasto", value: fmtBrl(ad.spend) },
            { label: "CTR", value: `${fmt(ad.ctr)}%` },
            { label: "CPC", value: fmtBrl(ad.cpc) },
            { label: "CPM", value: fmtBrl(ad.cpm) },
          ].map((k) => (
            <div key={k.label} className="bg-white/60 rounded-lg px-2 py-1">
              <p className="text-[9px] text-slate-400">{k.label}</p>
              <p className="text-[11px] font-bold text-slate-800">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Health tip */}
      {health !== "paused" && health !== "performing" && (
        <p className="text-[10px] text-slate-500 flex items-start gap-1">
          <TriangleAlert className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
          {hCfg.tip}
        </p>
      )}
    </div>
  );
}

// ─── Creative Strategy Block ───

function CreativeStrategyBlock({ campaign, insights }: { campaign: MetaCampaignFull; insights: MetaCampaignInsights | null }) {
  const tips: Array<{ icon: typeof Lightbulb; title: string; description: string; priority: "high" | "medium" | "low" }> = [];

  // Analyze metrics and generate tips
  if (campaign.ctr < 0.5) {
    tips.push({
      icon: TrendingDown,
      title: "CTR abaixo de 0.5%",
      description: "O público não está engajando com os criativos. Teste novos formatos (carrossel, vídeo curto), copy mais direta e CTAs claros. Mude a primeira imagem ou os 3 primeiros segundos do vídeo.",
      priority: "high",
    });
  } else if (campaign.ctr < 1.0) {
    tips.push({
      icon: Activity,
      title: "CTR pode melhorar",
      description: "Teste variações de copy e headline. Crie versões com prova social (depoimentos, antes/depois). Considere vídeos com ganchos nos primeiros 3 segundos.",
      priority: "medium",
    });
  }

  if (campaign.cpm > 50) {
    tips.push({
      icon: DollarSign,
      title: "CPM muito alto",
      description: "O custo para alcançar 1.000 pessoas está elevado. Pode indicar público saturado ou concorrência alta. Teste expandir o público ou segmentos diferentes.",
      priority: "high",
    });
  }

  if (campaign.cpc > 5) {
    tips.push({
      icon: MousePointerClick,
      title: "CPC elevado",
      description: "Cada clique está caro. Melhore a relevância dos criativos para o público, teste CTAs diferentes e considere ajustar o bid cap do conjunto.",
      priority: "medium",
    });
  }

  const frequency = campaign.impressions > 0 && campaign.reach > 0
    ? campaign.impressions / campaign.reach
    : 0;

  if (frequency > 3) {
    tips.push({
      icon: TriangleAlert,
      title: `Frequência alta (${fmt(frequency, 1)}x)`,
      description: "O público já viu os anúncios muitas vezes. Adicione novos criativos para manter o interesse ou expanda o público-alvo.",
      priority: "high",
    });
  }

  // Actions-based tips
  if (insights) {
    const leads = insights.actions["lead"] ?? insights.actions["onsite_conversion.lead_grouped"] ?? 0;
    const costPerLead = insights.costPerAction["lead"] ?? insights.costPerAction["onsite_conversion.lead_grouped"] ?? 0;

    if (leads > 0 && costPerLead > 0) {
      tips.push({
        icon: Target,
        title: `Custo por Lead: ${fmtBrl(costPerLead)}`,
        description: leads > 10
          ? "Volume bom de leads. Foque em criativos que convertem melhor e pause os com custo por lead acima da média."
          : "Poucos leads ainda. Teste landing pages diferentes e criativos com mais urgência ou escassez.",
        priority: leads > 10 ? "low" : "medium",
      });
    }
  }

  if (tips.length === 0) {
    tips.push({
      icon: TrendingUp,
      title: "Campanha com boa performance",
      description: "Métricas saudáveis. Continue testando variações de criativos para manter a performance e evitar saturação do público.",
      priority: "low",
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const priorityColors = {
    high: "border-l-red-400",
    medium: "border-l-amber-400",
    low: "border-l-emerald-400",
  };

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Estratégia de Criativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-400">
          Recomendações baseadas nos insights dos últimos 30 dias para orientar a criação e gestão de novos criativos.
        </p>
        {tips.map((tip, i) => (
          <div key={i} className={`bg-slate-50 rounded-xl p-3 border-l-4 ${priorityColors[tip.priority]}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <tip.icon className="h-3.5 w-3.5 text-slate-600" />
              <p className="text-xs font-semibold text-slate-800">{tip.title}</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{tip.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Bid Cap Education Block ───

function BidCapEducation({ campaign }: { campaign: MetaCampaignFull }) {
  const cpc = campaign.cpc;
  const cpm = campaign.cpm;
  const frequency = campaign.impressions > 0 && campaign.reach > 0
    ? campaign.impressions / campaign.reach
    : 0;

  const suggestedMin = cpc > 0 ? Math.max(0.01, cpc * 0.8) : null;
  const suggestedMax = cpc > 0 ? cpc * 1.5 : null;
  const suggestedIdeal = cpc > 0 ? cpc * 1.1 : null;

  return (
    <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl shadow-sm">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">Guia de Bid Cap</p>
            <p className="text-xs text-blue-700/70 mt-1 leading-relaxed">
              O <span className="font-semibold">Bid Cap</span> define o valor máximo que você aceita pagar por resultado.
              O Meta otimiza para o menor custo dentro desse limite. Valores muito baixos reduzem a entrega; muito altos aumentam o custo sem retorno proporcional.
            </p>
          </div>
        </div>

        {/* Data-driven guidance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-blue-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">CPC Médio (30d)</p>
            <p className="text-lg font-bold text-blue-700">{cpc > 0 ? fmtBrl(cpc) : "—"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Referência principal para o bid</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-blue-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">CPM Médio (30d)</p>
            <p className="text-lg font-bold text-slate-900">{cpm > 0 ? fmtBrl(cpm) : "—"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Custo por 1.000 impressões</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-blue-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Frequência (30d)</p>
            <p className="text-lg font-bold text-slate-900">{frequency > 0 ? `${fmt(frequency, 1)}x` : "—"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Média de vezes que viram o ad</p>
          </div>
        </div>

        {/* Suggestion */}
        {suggestedMin != null && suggestedMax != null && suggestedIdeal != null && (
          <div className="bg-white rounded-xl p-4 border border-blue-200 space-y-2">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-blue-600" />
              <p className="text-xs font-semibold text-blue-900">Recomendação de Bid Cap</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Mínimo</span>
                  <span>Ideal</span>
                  <span>Máximo</span>
                </div>
                <div className="h-2.5 rounded-full bg-gradient-to-r from-red-200 via-emerald-300 to-amber-200 relative">
                  {/* Ideal marker */}
                  <div
                    className="absolute top-[-2px] w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                    style={{ left: `calc(50% - 7px)` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold mt-1">
                  <span className="text-red-600">{fmtBrl(suggestedMin)}</span>
                  <span className="text-emerald-600">{fmtBrl(suggestedIdeal)}</span>
                  <span className="text-amber-600">{fmtBrl(suggestedMax)}</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 space-y-1 mt-2">
              <p><span className="font-semibold text-red-600">Abaixo de {fmtBrl(suggestedMin)}:</span> Meta pode não entregar impressões suficientes.</p>
              <p><span className="font-semibold text-emerald-600">Em torno de {fmtBrl(suggestedIdeal)}:</span> Ponto ideal — 10% acima do CPC médio garante entrega sem custo excessivo.</p>
              <p><span className="font-semibold text-amber-600">Acima de {fmtBrl(suggestedMax)}:</span> Risco de pagar mais sem aumento proporcional de resultados.</p>
            </div>
          </div>
        )}

        {cpc === 0 && (
          <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
            <p className="text-xs text-slate-400">Sem dados de CPC ainda. Os insights aparecerão após a campanha acumular cliques.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───

export function MetaPageClient({
  campaigns, hasConfig, pixelId, events, stages,
  selectedCampaign, selectedAdSets, selectedInsights, selectedCampaignId, apiError,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [editBudget, setEditBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(selectedCampaign?.dailyBudget?.toString() ?? "");
  const [campaignStatus, setCampaignStatus] = useState(selectedCampaign?.status ?? "PAUSED");
  const isActive = campaignStatus === "ACTIVE";

  if (!hasConfig) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={24} /> Meta Ads</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <Card className="border-slate-100 rounded-2xl">
          <CardContent className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto"><MetaIcon size={28} /></div>
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

  if (!selectedCampaignId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={24} /> Meta Ads</h1>
          <p className="text-sm text-slate-400 mt-1">Gerencie campanhas, bid cap, criativos e eventos</p>
        </div>
        <Card className="border-amber-100 bg-amber-50/30 rounded-2xl">
          <CardContent className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto">
              <AlertCircle className="h-7 w-7 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-amber-900">Selecione uma campanha principal</p>
            <p className="text-xs text-amber-700/70 max-w-md mx-auto">
              Vá em <span className="font-medium">Configurações → Campanha Principal</span> e escolha
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
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={24} /> Meta Ads</h1>
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
              Vá em <span className="font-medium">Configurações → Pixel do Facebook</span> para verificar o token,
              ou selecione outra campanha em <span className="font-medium">Configurações → Campanha Principal</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleToggleStatus() {
    const newStatus = isActive ? "PAUSED" : "ACTIVE";
    startTransition(async () => {
      const result = await updateCampaignStatus(selectedCampaign!.id, newStatus);
      if (result.success) { setCampaignStatus(newStatus); toast.success(`Campanha ${newStatus === "ACTIVE" ? "ativada" : "pausada"}`); }
      else toast.error(result.error);
    });
  }

  async function handleSaveBudget() {
    const val = parseFloat(budgetValue);
    if (isNaN(val) || val <= 0) { toast.error("Valor inválido"); return; }
    startTransition(async () => {
      const result = await updateCampaignBudget(selectedCampaign!.id, val);
      if (result.success) { toast.success("Orçamento atualizado"); setEditBudget(false); }
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><MetaIcon size={24} /> Meta Ads</h1>
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

      {/* Campaign KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Gasto", value: fmtBrl(selectedCampaign.spend), icon: DollarSign },
          { label: "Impressões", value: selectedCampaign.impressions.toLocaleString("pt-BR"), icon: Eye },
          { label: "Cliques", value: selectedCampaign.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
          { label: "Alcance", value: selectedCampaign.reach.toLocaleString("pt-BR"), icon: Users },
          { label: "CTR", value: `${fmt(selectedCampaign.ctr)}%`, icon: Target },
          { label: "CPM", value: fmtBrl(selectedCampaign.cpm), icon: DollarSign },
          { label: "CPC", value: fmtBrl(selectedCampaign.cpc), icon: MousePointerClick },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <kpi.icon className="h-3 w-3 text-slate-400" />
              <p className="text-[10px] text-slate-400">{kpi.label}</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Quality + Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quality */}
        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900">Qualidade dos Anúncios</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Thermometer label="CTR" value={`${fmt(selectedCampaign.ctr)}%`} quality={scoreCTR(selectedCampaign.ctr)} />
              <Thermometer label="CPM" value={fmtBrl(selectedCampaign.cpm)} quality={scoreCPM(selectedCampaign.cpm)} />
              <Thermometer label="CPC" value={fmtBrl(selectedCampaign.cpc)} quality={scoreCPC(selectedCampaign.cpc)} />
            </div>
          </CardContent>
        </Card>

        {/* Budget & Strategy */}
        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900">Orçamento & Estratégia</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Objetivo</p>
                <p className="text-sm font-semibold text-slate-900">{OBJECTIVES[selectedCampaign.objective] ?? selectedCampaign.objective}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Estratégia de Lance</p>
                <p className="text-sm font-semibold text-blue-700">{selectedCampaign.bidStrategy ? BID_STRATEGIES[selectedCampaign.bidStrategy] ?? selectedCampaign.bidStrategy : "Padrão"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-slate-500">Orçamento diário</p>
                <p className="text-lg font-bold text-slate-900">{selectedCampaign.dailyBudget != null ? fmtBrl(selectedCampaign.dailyBudget) : "Não definido"}</p>
              </div>
              {!editBudget ? (
                <button onClick={() => setEditBudget(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Alterar</button>
              ) : (
                <div className="flex items-center gap-2">
                  <Input type="number" value={budgetValue} onChange={(e) => setBudgetValue(e.target.value)} className="h-8 w-28 text-xs rounded-lg" placeholder="R$" />
                  <Button size="sm" onClick={handleSaveBudget} disabled={isPending} className="h-8 text-xs rounded-lg">Salvar</Button>
                  <button onClick={() => setEditBudget(false)} className="text-xs text-slate-400">Cancelar</button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bid Cap Education */}
      <BidCapEducation campaign={selectedCampaign} />

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
              <AdSetRow
                key={adSet.id}
                adSet={adSet}
                campaignCpc={selectedCampaign.cpc}
                campaignCpm={selectedCampaign.cpm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Creative Strategy */}
      <CreativeStrategyBlock campaign={selectedCampaign} insights={selectedInsights} />

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
