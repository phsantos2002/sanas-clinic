"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  TrendingUp,
  Target,
  MessageCircle,
  ArrowRight,
  DollarSign,
  MousePointerClick,
  Eye,
  Zap,
  ZapOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { MetaIcon } from "@/components/icons/SourceIcons";
import { getBenchmark, classifyMetric, type BenchmarkMetrics } from "@/lib/benchmarks";
import type { FullAnalytics } from "@/app/actions/analytics";
import type { LeadSourceStats } from "@/types";
import type { MetaCampaign } from "@/services/metaAds";

type PixelConfig = {
  bidStrategy: string | null;
  campaignObjective: string | null;
  businessSegment: string | null;
  coverageArea: string | null;
  conversionValue: number | null;
} | null;

type CampaignConfigInfo = {
  bidStrategy: string | null;
  campaignObjective: string | null;
  businessSegment: string | null;
};

type Props = {
  data: FullAnalytics;
  sourceStats: LeadSourceStats;
  pixelConfig?: PixelConfig;
  campaignsList?: Array<{ id: string; name: string; status: string }>;
  campaignConfigMap?: Record<string, CampaignConfigInfo>;
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBrl(n: number) {
  return `R$ ${fmt(n)}`;
}

type Quality = "good" | "ok" | "bad";

function scoreWithBenchmark(
  metric: "ctr" | "cpm" | "cpc",
  value: number,
  bench: BenchmarkMetrics | null
): Quality {
  if (bench) {
    const q = classifyMetric(metric, value, bench);
    return q === "good" ? "good" : q === "average" ? "ok" : "bad";
  }
  if (metric === "ctr") return value >= 1.5 ? "good" : value >= 0.5 ? "ok" : "bad";
  if (metric === "cpm") return value <= 20 ? "good" : value <= 50 ? "ok" : "bad";
  return value <= 2 ? "good" : value <= 5 ? "ok" : "bad";
}

const qualityConfig: Record<Quality, { label: string; color: string; bar: string }> = {
  good: { label: "Ótimo", color: "text-emerald-600", bar: "bg-emerald-500" },
  ok: { label: "Regular", color: "text-amber-600", bar: "bg-amber-400" },
  bad: { label: "Fraco", color: "text-red-500", bar: "bg-red-400" },
};

function Thermometer({
  label,
  value,
  quality,
}: {
  label: string;
  value: string;
  quality: Quality;
}) {
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

function CampaignCard({
  campaign,
  totalSpend,
  bench,
}: {
  campaign: MetaCampaign;
  totalSpend: number;
  bench: BenchmarkMetrics | null;
}) {
  const isActive = campaign.status === "ACTIVE";
  const shareOfSpend = totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0;

  return (
    <div
      className={`bg-white border rounded-2xl p-5 space-y-4 ${isActive ? "border-blue-200" : "border-slate-100"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{campaign.name}</p>
        <span
          className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {isActive ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
          {isActive ? "Ativa" : "Pausada"}
        </span>
      </div>
      {shareOfSpend > 0 && <p className="text-xs text-slate-400">{shareOfSpend}% do gasto total</p>}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[11px] text-slate-400">Gasto</p>
          <p className="text-base font-bold text-slate-900">{fmtBrl(campaign.spend)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Impressões</p>
          <p className="text-base font-bold text-slate-900">
            {campaign.impressions.toLocaleString("pt-BR")}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Cliques</p>
          <p className="text-base font-bold text-slate-900">
            {campaign.clicks.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Thermometer
          label="CTR"
          value={`${fmt(campaign.ctr)}%`}
          quality={scoreWithBenchmark("ctr", campaign.ctr, bench)}
        />
        <Thermometer
          label="CPM"
          value={fmtBrl(campaign.cpm)}
          quality={scoreWithBenchmark("cpm", campaign.cpm, bench)}
        />
        <Thermometer
          label="CPC"
          value={fmtBrl(campaign.cpc)}
          quality={scoreWithBenchmark("cpc", campaign.cpc, bench)}
        />
      </div>
    </div>
  );
}

function StrategyInsight({
  label,
  status,
  detail,
}: {
  label: string;
  status: Quality;
  detail: string;
}) {
  const icons = { good: CheckCircle, ok: CheckCircle, bad: XCircle };
  const colors = { good: "text-emerald-600", ok: "text-amber-600", bad: "text-red-500" };
  const bgs = { good: "bg-emerald-50", ok: "bg-amber-50", bad: "bg-red-50" };
  const Icon = icons[status];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${bgs[status]}`}>
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colors[status]}`} />
      <div>
        <p className={`text-xs font-semibold ${colors[status]}`}>{label}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

const STRATEGY_NAMES: Record<string, string> = {
  LOWEST_COST: "Menor Custo",
  COST_CAP: "Cost Cap",
  BID_CAP: "Bid Cap",
  ROAS_MIN: "ROAS Mínimo",
};

const STAGE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
const SOURCE_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#8b5cf6", "#a1a1aa"];

export function AnalyticsClient({
  data,
  sourceStats,
  pixelConfig,
  campaignsList,
  campaignConfigMap,
}: Props) {
  const {
    pipeline,
    metaAds,
    campaigns,
    hasMetaConfig,
    metaError,
    selectedCampaignId,
    selectedCampaignName,
  } = data;

  // Campaign selector state — "all" means full account, otherwise campaign ID
  const [analysisCampaignId, setAnalysisCampaignId] = useState<string>("all");
  const analysisCampaign =
    analysisCampaignId !== "all" ? campaigns.find((c) => c.id === analysisCampaignId) : null;

  // Use per-campaign config if selected, otherwise fall back to pixel config
  const campaignCfg = analysisCampaignId !== "all" ? campaignConfigMap?.[analysisCampaignId] : null;
  const effectiveObjective =
    campaignCfg?.campaignObjective ?? pixelConfig?.campaignObjective ?? null;
  const effectiveSegment = campaignCfg?.businessSegment ?? pixelConfig?.businessSegment ?? null;
  const effectiveStrategy = campaignCfg?.bidStrategy ?? pixelConfig?.bidStrategy ?? null;

  // Use campaign-specific metrics when a campaign is selected
  const displayMetrics = analysisCampaign
    ? {
        spend: analysisCampaign.spend,
        impressions: analysisCampaign.impressions,
        clicks: analysisCampaign.clicks,
        reach: analysisCampaign.reach,
        ctr: analysisCampaign.ctr,
        cpm: analysisCampaign.cpm,
        cpc: analysisCampaign.cpc,
      }
    : metaAds;

  const costPerLead =
    displayMetrics && pipeline.totalLeads > 0 ? displayMetrics.spend / pipeline.totalLeads : null;
  const costPerConversation =
    displayMetrics && pipeline.leadsWithConversation > 0
      ? displayMetrics.spend / pipeline.leadsWithConversation
      : null;
  const scheduledCount = pipeline.funnelSteps[3]?.count ?? 0;
  const clientCount = pipeline.funnelSteps[4]?.count ?? 0;
  const costPerScheduled =
    displayMetrics && scheduledCount > 0 ? displayMetrics.spend / scheduledCount : null;
  const costPerClient =
    displayMetrics && clientCount > 0 ? displayMetrics.spend / clientCount : null;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const sortedCampaigns = [...activeCampaigns, ...campaigns.filter((c) => c.status !== "ACTIVE")];

  // Benchmark-aware scoring — adapted to selected campaign config
  const bench = getBenchmark(
    effectiveObjective,
    effectiveSegment,
    pixelConfig?.coverageArea ?? null
  );
  const strategyName = effectiveStrategy
    ? (STRATEGY_NAMES[effectiveStrategy] ?? effectiveStrategy)
    : null;

  const stageChartData = pipeline.leadsByStage.map((s) => ({
    name: s.stageName,
    leads: s.count,
  }));

  const sourceChartData = [
    { name: "Meta Ads", value: sourceStats.meta },
    { name: "Google Ads", value: sourceStats.google },
    { name: "WhatsApp", value: sourceStats.whatsapp },
    { name: "Manual", value: sourceStats.manual },
    { name: "Não rastreada", value: sourceStats.unknown },
  ].filter((s) => s.value > 0);

  const funnelChartData = pipeline.funnelSteps.map((s) => ({
    name: s.label,
    count: s.count,
    rate: s.rate,
  }));

  const radarData = displayMetrics
    ? [
        {
          metric: "CTR",
          value: Math.min((displayMetrics.ctr / 3) * 100, 100),
          raw: `${fmt(displayMetrics.ctr)}%`,
        },
        {
          metric: "Alcance",
          value: Math.min(
            (displayMetrics.reach / Math.max(displayMetrics.impressions, 1)) * 100,
            100
          ),
          raw: displayMetrics.reach.toLocaleString("pt-BR"),
        },
        {
          metric: "CPC",
          value: Math.max(0, 100 - displayMetrics.cpc * 10),
          raw: fmtBrl(displayMetrics.cpc),
        },
        {
          metric: "CPM",
          value: Math.max(0, 100 - displayMetrics.cpm * 1.5),
          raw: fmtBrl(displayMetrics.cpm),
        },
        {
          metric: "Cliques",
          value: Math.min((displayMetrics.clicks / Math.max(pipeline.totalLeads, 1)) * 20, 100),
          raw: displayMetrics.clicks.toLocaleString("pt-BR"),
        },
      ]
    : [];

  // Strategy-aware efficiency scoring
  const strategyEfficiency = displayMetrics
    ? (() => {
        const cpcQ = scoreWithBenchmark("cpc", displayMetrics.cpc, bench);
        const ctrQ = scoreWithBenchmark("ctr", displayMetrics.ctr, bench);
        const cpmQ = scoreWithBenchmark("cpm", displayMetrics.cpm, bench);
        const scoreMap = { good: 100, ok: 55, bad: 15 };
        const cpcScore = scoreMap[cpcQ];
        const ctrScore = scoreMap[ctrQ];
        const cpmScore = scoreMap[cpmQ];
        return {
          cpcScore,
          ctrScore,
          cpmScore,
          avg: Math.round((cpcScore + ctrScore + cpmScore) / 3),
        };
      })()
    : null;

  // Pipeline cost flow
  const pipelineCostFlow = displayMetrics
    ? pipeline.funnelSteps.map((step) => ({
        name: step.label
          .replace("Leads captados", "Leads")
          .replace("Conversas WhatsApp", "Conversas"),
        leads: step.count,
        custo: step.count > 0 ? Math.round((displayMetrics.spend / step.count) * 100) / 100 : 0,
      }))
    : [];

  // Strategy-specific insight descriptions
  function getCpcDescription(cpc: number): string {
    const q = scoreWithBenchmark("cpc", cpc, bench);
    if (strategyName === "Menor Custo") {
      return q === "good"
        ? "CPC excelente — a Meta está otimizando bem o custo"
        : q === "ok"
          ? "CPC moderado — expanda o público para reduzir concorrência"
          : "CPC alto — revise segmentação e criativos";
    }
    if (strategyName === "Cost Cap") {
      return q === "good"
        ? "CPC dentro do cap — boa eficiência de entrega"
        : q === "ok"
          ? "CPC próximo do limite — monitore a entrega"
          : "CPC acima do ideal — considere aumentar o cap ou otimizar criativos";
    }
    if (strategyName === "Bid Cap") {
      return q === "good"
        ? "CPC baixo — bid cap competitivo"
        : q === "ok"
          ? "CPC moderado — considere ajustar o bid"
          : "CPC alto — bid cap pode estar elevado";
    }
    if (strategyName === "ROAS Mínimo") {
      return q === "good"
        ? "CPC baixo — bom retorno por clique"
        : q === "ok"
          ? "CPC moderado — monitore o ROAS"
          : "CPC alto — impacta negativamente o ROAS";
    }
    return q === "good"
      ? "CPC eficiente"
      : q === "ok"
        ? "CPC moderado — busque otimizar"
        : "CPC alto — revise segmentação e criativos";
  }

  function getCtrDescription(ctr: number): string {
    const q = scoreWithBenchmark("ctr", ctr, bench);
    return q === "good"
      ? "CTR alto — criativos performando bem"
      : q === "ok"
        ? "CTR moderado — teste novos criativos"
        : "CTR baixo — revise criativos e segmentação";
  }

  function getCpmDescription(cpm: number): string {
    const q = scoreWithBenchmark("cpm", cpm, bench);
    return q === "good"
      ? "CPM saudável — boa entrega"
      : q === "ok"
        ? "CPM elevado — audiência pode estar saturada"
        : "CPM muito alto — reduza público ou mude posicionamento";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Funil completo: Anúncios → WhatsApp → Clientes
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          {
            label: "Total Leads",
            value: pipeline.totalLeads.toString(),
            icon: Users,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
          {
            label: "Conversas",
            value: pipeline.leadsWithConversation.toString(),
            icon: MessageCircle,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
          {
            label: "Taxa Conversão",
            value: `${pipeline.conversionRate}%`,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Estágios Ativos",
            value: `${pipeline.leadsByStage.filter((s) => s.count > 0).length}`,
            icon: Target,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Gasto Meta",
            value: metaAds ? fmtBrl(metaAds.spend) : "—",
            icon: DollarSign,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {kpi.label}
              </p>
              <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ============== CAMPANHA / INSIGHTS META ADS ============== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <MetaIcon size={16} />
            </div>
            Insights Meta Ads
          </h2>
          {/* Campaign selector — styled */}
          {(campaignsList ?? campaigns).length > 0 && (
            <CampaignSelectorDropdown
              campaigns={campaignsList ?? campaigns}
              value={analysisCampaignId}
              onChange={setAnalysisCampaignId}
            />
          )}
        </div>

        {displayMetrics ? (
          <div className="space-y-4">
            {/* Main KPIs */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {analysisCampaign
                  ? `${analysisCampaign.name} — Últimos 30 dias`
                  : "Conta completa — Últimos 30 dias"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {[
                  { label: "Gasto", value: fmtBrl(displayMetrics.spend), icon: DollarSign },
                  {
                    label: "Impressões",
                    value: displayMetrics.impressions.toLocaleString("pt-BR"),
                    icon: Eye,
                  },
                  {
                    label: "Cliques",
                    value: displayMetrics.clicks.toLocaleString("pt-BR"),
                    icon: MousePointerClick,
                  },
                  {
                    label: "Alcance",
                    value: displayMetrics.reach.toLocaleString("pt-BR"),
                    icon: Users,
                  },
                  {
                    label: "Custo/Lead",
                    value: costPerLead != null ? fmtBrl(costPerLead) : "—",
                    icon: Target,
                  },
                  {
                    label: "Custo/Conversa",
                    value: costPerConversation != null ? fmtBrl(costPerConversation) : "—",
                    icon: MessageCircle,
                  },
                  {
                    label: "Custo/Cliente",
                    value: costPerClient != null ? fmtBrl(costPerClient) : "—",
                    icon: TrendingUp,
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon className="h-3 w-3 text-slate-400" />
                      <p className="text-[11px] text-slate-400">{item.label}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Analysis — adapts to configured strategy */}
            {strategyEfficiency && (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Análise de Performance
                      {strategyName && (
                        <span className="text-slate-400 font-normal ml-1">— {strategyName}</span>
                      )}
                    </h3>
                    {bench && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Benchmarks ajustados para seu segmento e objetivo
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      strategyEfficiency.avg >= 70
                        ? "bg-emerald-50 text-emerald-700"
                        : strategyEfficiency.avg >= 40
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {strategyEfficiency.avg >= 70 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    Score: {strategyEfficiency.avg}/100
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    {[
                      {
                        label: "Eficiência do CPC",
                        score: strategyEfficiency.cpcScore,
                        value: fmtBrl(displayMetrics.cpc),
                        desc: getCpcDescription(displayMetrics.cpc),
                      },
                      {
                        label: "Engajamento (CTR)",
                        score: strategyEfficiency.ctrScore,
                        value: `${fmt(displayMetrics.ctr)}%`,
                        desc: getCtrDescription(displayMetrics.ctr),
                      },
                      {
                        label: "Custo de Exposição (CPM)",
                        score: strategyEfficiency.cpmScore,
                        value: fmtBrl(displayMetrics.cpm),
                        desc: getCpmDescription(displayMetrics.cpm),
                      },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-700">{item.label}</span>
                          <span className="text-xs font-bold text-slate-900">{item.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.score >= 70
                                ? "bg-emerald-500"
                                : item.score >= 40
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                            }`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <StrategyInsight
                      label="Relação Gasto x Resultados"
                      status={
                        costPerClient != null && costPerClient < displayMetrics.spend * 0.3
                          ? "good"
                          : costPerLead != null && costPerLead < (bench?.cpl.average ?? 10)
                            ? "ok"
                            : "bad"
                      }
                      detail={
                        costPerClient != null
                          ? `Cada cliente custa ${fmtBrl(costPerClient)}. ${costPerClient < (bench?.cpl.average ?? 50) ? "Valor dentro do benchmark para seu segmento." : "Considere otimizar funil para reduzir esse custo."}`
                          : "Sem dados suficientes de conversão para analisar."
                      }
                    />
                    <StrategyInsight
                      label="Taxa de Cliques vs Impressões"
                      status={scoreWithBenchmark("ctr", displayMetrics.ctr, bench)}
                      detail={`${displayMetrics.clicks.toLocaleString("pt-BR")} cliques de ${displayMetrics.impressions.toLocaleString("pt-BR")} impressões (${fmt(displayMetrics.ctr)}%). ${
                        scoreWithBenchmark("ctr", displayMetrics.ctr, bench) === "good"
                          ? "O público está respondendo bem ao criativo."
                          : scoreWithBenchmark("ctr", displayMetrics.ctr, bench) === "ok"
                            ? "Há espaço para melhorar — teste variações de copy e imagem."
                            : "Público ou criativo precisa de revisão urgente."
                      }`}
                    />
                    <StrategyInsight
                      label="Eficiência do Alcance"
                      status={
                        displayMetrics.reach / Math.max(displayMetrics.impressions, 1) > 0.5
                          ? "good"
                          : displayMetrics.reach / Math.max(displayMetrics.impressions, 1) > 0.3
                            ? "ok"
                            : "bad"
                      }
                      detail={`Alcance de ${displayMetrics.reach.toLocaleString("pt-BR")} pessoas com ${displayMetrics.impressions.toLocaleString("pt-BR")} impressões. ${
                        displayMetrics.reach / Math.max(displayMetrics.impressions, 1) > 0.5
                          ? "Boa diversidade de público — frequência controlada."
                          : "Frequência alta — o mesmo público está vendo o anúncio várias vezes."
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campaign-type-specific insights */}
            {analysisCampaign && effectiveObjective && (
              <CampaignTypeInsights
                objective={effectiveObjective}
                metrics={displayMetrics}
                pipeline={pipeline}
                bench={bench}
                costPerLead={costPerLead}
                costPerConversation={costPerConversation}
                costPerClient={costPerClient}
              />
            )}

            {/* Quality radar + cost per step */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Qualidade dos Anúncios
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12 }}
                      formatter={(_: unknown, __: unknown, props: { payload?: { raw?: string } }) =>
                        props.payload?.raw ?? ""
                      }
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 mt-4 border-t border-slate-100 pt-4">
                  <Thermometer
                    label="CTR médio"
                    value={`${fmt(displayMetrics.ctr)}%`}
                    quality={scoreWithBenchmark("ctr", displayMetrics.ctr, bench)}
                  />
                  <Thermometer
                    label="CPM médio"
                    value={fmtBrl(displayMetrics.cpm)}
                    quality={scoreWithBenchmark("cpm", displayMetrics.cpm, bench)}
                  />
                  <Thermometer
                    label="CPC médio"
                    value={fmtBrl(displayMetrics.cpc)}
                    quality={scoreWithBenchmark("cpc", displayMetrics.cpc, bench)}
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  Custo por Etapa do Funil
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Custo por Lead", value: costPerLead },
                    { label: "Custo por Conversa", value: costPerConversation },
                    { label: "Custo por Agendamento", value: costPerScheduled },
                    { label: "Custo por Cliente", value: costPerClient, highlight: true },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl p-4 ${"highlight" in item && item.highlight ? "bg-blue-50 border border-blue-100" : "bg-slate-50"}`}
                    >
                      <p
                        className={`text-xs ${"highlight" in item && item.highlight ? "text-blue-600" : "text-slate-500"}`}
                      >
                        {item.label}
                      </p>
                      <p
                        className={`text-xl font-bold mt-1 ${"highlight" in item && item.highlight ? "text-blue-700" : "text-slate-900"}`}
                      >
                        {item.value != null ? fmtBrl(item.value) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaigns */}
            {analysisCampaignId === "all" && campaigns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Campanhas</h3>
                  {activeCampaigns.length > 0 && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {activeCampaigns.length} ativa{activeCampaigns.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sortedCampaigns.map((c) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      totalSpend={metaAds?.spend ?? 0}
                      bench={bench}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
            {!hasMetaConfig ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
                  <MetaIcon size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700">Conecte o Meta Ads</p>
                <p className="text-xs text-slate-400">
                  Configure em Configurações → Pixel do Facebook
                </p>
              </div>
            ) : metaError ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-amber-700">Token expirado</p>
                <p className="text-xs text-amber-600">Gere um novo token em Configurações</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sem dados no período</p>
            )}
          </div>
        )}
      </div>

      {/* ============== PIPELINE x ANÚNCIO ============== */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-violet-500" />
          Pipeline vs. Anúncio
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pipeline cost flow */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Custo por Etapa</h3>
            <p className="text-[11px] text-slate-400 mb-4">
              Quanto custa cada lead em cada estágio do funil
            </p>
            {pipelineCostFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={pipelineCostFlow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="leads"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="custo"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `R$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 12 }}
                    formatter={(value: unknown, name: unknown) =>
                      name === "custo" ? fmtBrl(Number(value)) : String(value)
                    }
                  />
                  <Line
                    yAxisId="leads"
                    type="monotone"
                    dataKey="leads"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#8b5cf6" }}
                    name="Leads"
                  />
                  <Line
                    yAxisId="custo"
                    type="monotone"
                    dataKey="custo"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: "#f59e0b" }}
                    name="custo"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                Configure Meta Ads para visualizar
              </p>
            )}
          </div>

          {/* Conversion efficiency */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Eficiência de Conversão</h3>
            <p className="text-[11px] text-slate-400 mb-4">Retenção em cada etapa do funil</p>
            <div className="space-y-3">
              {pipeline.funnelSteps.map((step, i) => {
                const prevCount = i > 0 ? pipeline.funnelSteps[i - 1].count : step.count;
                const dropoff =
                  prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;
                const retention = 100 - dropoff;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        {i > 0 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                        <span className="font-medium text-slate-700">{step.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{step.count}</span>
                        {i > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              retention >= 50
                                ? "bg-emerald-50 text-emerald-700"
                                : retention >= 25
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {retention}% retidos
                          </span>
                        )}
                        {displayMetrics && step.count > 0 && (
                          <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-lg">
                            {fmtBrl(displayMetrics.spend / step.count)}/un
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress value={step.rate} className="h-2" />
                  </div>
                );
              })}
            </div>
            {metaAds && pipeline.totalLeads > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-violet-50 rounded-xl p-3">
                    <p className="text-[10px] text-violet-600 font-medium">ROI do Funil</p>
                    <p className="text-lg font-bold text-violet-800">
                      {clientCount > 0 ? `${fmt(pipeline.totalLeads / clientCount, 1)}:1` : "—"}
                    </p>
                    <p className="text-[10px] text-violet-500">Leads necessários por cliente</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-[10px] text-blue-600 font-medium">Eficiência Geral</p>
                    <p className="text-lg font-bold text-blue-800">
                      {fmt(
                        (pipeline.leadsWithConversation / Math.max(pipeline.totalLeads, 1)) * 100,
                        0
                      )}
                      %
                    </p>
                    <p className="text-[10px] text-blue-500">Leads com conversa ativa</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============== FUNIL DE CONVERSÃO ============== */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
          Funil de Conversão
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Distribuição por Origem</h3>
            {sourceChartData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sem dados</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {sourceChartData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {sourceChartData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        <span className="text-slate-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">
                        {s.value} (
                        {sourceStats.total > 0
                          ? Math.round((s.value / sourceStats.total) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Leads by stage */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Leads por Estágio do Pipeline</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stageChartData} layout="vertical" barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Bar dataKey="leads" radius={[0, 8, 8, 0]}>
              {stageChartData.map((_, i) => (
                <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Styled Campaign Selector ───

function CampaignSelectorDropdown({
  campaigns,
  value,
  onChange,
}: {
  campaigns: Array<{ id: string; name: string; status: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value === "all" ? null : campaigns.find((c) => c.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white hover:bg-slate-50 transition-colors max-w-[260px]"
      >
        {selected ? (
          <>
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            <span className="truncate font-medium text-slate-700">{selected.name}</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
            <span className="font-medium text-slate-700">Conta completa</span>
          </>
        )}
        <svg
          className={`h-3.5 w-3.5 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[240px] max-h-[280px] overflow-y-auto">
            <button
              onClick={() => {
                onChange("all");
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${value === "all" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"}`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              Conta completa
            </button>
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 transition-colors ${value === c.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-700"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"}`}
                />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Campaign Type-Specific Insights ───

const OBJECTIVE_INSIGHTS: Record<
  string,
  {
    title: string;
    metrics: Array<{ label: string; key: string; format: (v: number) => string }>;
    tips: Array<{
      condition: (m: Record<string, number>) => boolean;
      text: string;
      status: Quality;
    }>;
  }
> = {
  AWARENESS: {
    title: "Insights — Seguidores & Alcance",
    metrics: [
      {
        label: "Custo por 1.000 alcançados",
        key: "costPer1kReach",
        format: (v) => `R$ ${v.toFixed(2)}`,
      },
      { label: "Alcance total", key: "reach", format: (v) => v.toLocaleString("pt-BR") },
      { label: "Frequência", key: "frequency", format: (v) => `${v.toFixed(1)}x` },
      { label: "Impressões", key: "impressions", format: (v) => v.toLocaleString("pt-BR") },
    ],
    tips: [
      {
        condition: (m) => m.frequency > 3,
        text: "Frequência acima de 3x — o público está vendo o anúncio repetidamente. Expanda a audiência ou renove os criativos.",
        status: "bad",
      },
      {
        condition: (m) => m.frequency <= 2,
        text: "Frequência saudável — boa distribuição do alcance sem saturação.",
        status: "good",
      },
      {
        condition: (m) => m.costPer1kReach > 30,
        text: "Custo por alcance alto — teste públicos mais amplos ou posicionamentos automáticos.",
        status: "bad",
      },
      {
        condition: (m) => m.costPer1kReach <= 15 && m.costPer1kReach > 0,
        text: "Custo por alcance eficiente — campanha com boa entrega.",
        status: "good",
      },
      {
        condition: (m) => m.ctr < 0.5 && m.impressions > 1000,
        text: "CTR baixo para campanha de alcance — criativos não geram interesse.",
        status: "bad",
      },
    ],
  },
  MESSAGES: {
    title: "Insights — Mensagens",
    metrics: [
      {
        label: "Custo por conversa",
        key: "costPerConversation",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
      {
        label: "Custo por lead",
        key: "costPerLead",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
      {
        label: "Conversas iniciadas",
        key: "conversations",
        format: (v) => v.toLocaleString("pt-BR"),
      },
      { label: "Taxa clique→conversa", key: "clickToConvRate", format: (v) => `${v.toFixed(1)}%` },
    ],
    tips: [
      {
        condition: (m) => m.costPerConversation > 0 && m.costPerConversation < 10,
        text: "Custo por conversa excelente — abaixo de R$ 10.",
        status: "good",
      },
      {
        condition: (m) => m.costPerConversation > 30,
        text: "Custo por conversa alto — revise público-alvo e criativos.",
        status: "bad",
      },
      {
        condition: (m) => m.clickToConvRate < 20 && m.clicks > 10,
        text: "Poucos cliques viram conversas — revise a mensagem inicial do WhatsApp.",
        status: "bad",
      },
      {
        condition: (m) => m.clickToConvRate >= 40,
        text: "Boa taxa de conversão clique→conversa — funil eficiente.",
        status: "good",
      },
    ],
  },
  ENGAGEMENT: {
    title: "Insights — Engajamento",
    metrics: [
      {
        label: "Custo por engajamento",
        key: "costPerEngagement",
        format: (v) => `R$ ${v.toFixed(2)}`,
      },
      { label: "Engajamentos", key: "engagements", format: (v) => v.toLocaleString("pt-BR") },
      { label: "CTR", key: "ctr", format: (v) => `${v.toFixed(2)}%` },
      { label: "Alcance", key: "reach", format: (v) => v.toLocaleString("pt-BR") },
    ],
    tips: [
      {
        condition: (m) => m.ctr >= 2,
        text: "CTR alto — o público está engajando bem com o conteúdo.",
        status: "good",
      },
      {
        condition: (m) => m.ctr < 0.5 && m.impressions > 1000,
        text: "CTR muito baixo — teste vídeos curtos ou carrosséis.",
        status: "bad",
      },
      {
        condition: (m) => m.costPerEngagement < 0.5 && m.costPerEngagement > 0,
        text: "Custo por engajamento baixo — excelente para brand awareness.",
        status: "good",
      },
    ],
  },
  TRAFFIC: {
    title: "Insights — Tráfego",
    metrics: [
      { label: "CPC (link)", key: "cpc", format: (v) => `R$ ${v.toFixed(2)}` },
      { label: "Cliques no link", key: "clicks", format: (v) => v.toLocaleString("pt-BR") },
      { label: "CTR (link)", key: "ctr", format: (v) => `${v.toFixed(2)}%` },
      {
        label: "Custo por lead",
        key: "costPerLead",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
    ],
    tips: [
      {
        condition: (m) => m.cpc < 1.5 && m.cpc > 0,
        text: "CPC de link baixo — tráfego barato e eficiente.",
        status: "good",
      },
      {
        condition: (m) => m.cpc > 5,
        text: "CPC de link alto — revise a segmentação ou teste landing pages.",
        status: "bad",
      },
      {
        condition: (m) => m.ctr >= 1.5,
        text: "CTR acima da média — anúncios gerando interesse.",
        status: "good",
      },
      {
        condition: (m) => m.ctr < 0.5 && m.impressions > 1000,
        text: "CTR baixo — teste títulos e imagens mais chamativos.",
        status: "bad",
      },
    ],
  },
  LEADS: {
    title: "Insights — Geração de Leads",
    metrics: [
      {
        label: "Custo por lead",
        key: "costPerLead",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
      { label: "Leads captados", key: "totalLeads", format: (v) => v.toLocaleString("pt-BR") },
      { label: "Taxa conversão", key: "conversionRate", format: (v) => `${v.toFixed(1)}%` },
      {
        label: "Custo por cliente",
        key: "costPerClient",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
    ],
    tips: [
      {
        condition: (m) => m.costPerLead > 0 && m.costPerLead < 15,
        text: "Custo por lead saudável — abaixo de R$ 15.",
        status: "good",
      },
      {
        condition: (m) => m.costPerLead > 50,
        text: "CPL alto — revise público, criativo e formulário.",
        status: "bad",
      },
      {
        condition: (m) => m.conversionRate >= 5,
        text: "Boa taxa de conversão — funil eficiente.",
        status: "good",
      },
      {
        condition: (m) => m.conversionRate < 1 && m.totalLeads > 5,
        text: "Taxa de conversão muito baixa — verifique qualificação dos leads.",
        status: "bad",
      },
    ],
  },
  SALES: {
    title: "Insights — Vendas",
    metrics: [
      {
        label: "Custo por venda",
        key: "costPerClient",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
      { label: "ROAS estimado", key: "roas", format: (v) => (v > 0 ? `${v.toFixed(1)}x` : "—") },
      { label: "Clientes", key: "clients", format: (v) => v.toLocaleString("pt-BR") },
      {
        label: "Custo por lead",
        key: "costPerLead",
        format: (v) => (v > 0 ? `R$ ${v.toFixed(2)}` : "—"),
      },
    ],
    tips: [
      {
        condition: (m) => m.roas >= 3,
        text: "ROAS acima de 3x — campanha lucrativa. Considere escalar.",
        status: "good",
      },
      {
        condition: (m) => m.roas > 0 && m.roas < 1,
        text: "ROAS abaixo de 1x — gastando mais do que faturando.",
        status: "bad",
      },
      {
        condition: (m) => m.costPerClient > 0 && m.costPerClient < 100,
        text: "Custo por venda controlado. Monitore o volume.",
        status: "good",
      },
    ],
  },
};

function CampaignTypeInsights({
  objective,
  metrics,
  pipeline,
  bench,
  costPerLead,
  costPerConversation,
  costPerClient,
}: {
  objective: string;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    ctr: number;
    cpm: number;
    cpc: number;
  };
  pipeline: {
    totalLeads: number;
    leadsWithConversation: number;
    conversionRate: number;
    funnelSteps: Array<{ count: number }>;
  };
  bench: BenchmarkMetrics | null;
  costPerLead: number | null;
  costPerConversation: number | null;
  costPerClient: number | null;
}) {
  const insightConfig = OBJECTIVE_INSIGHTS[objective];
  if (!insightConfig) return null;

  const clientCount = pipeline.funnelSteps[4]?.count ?? 0;
  const frequency = metrics.impressions > 0 ? metrics.impressions / Math.max(metrics.reach, 1) : 0;
  const costPer1kReach = metrics.reach > 0 ? (metrics.spend / metrics.reach) * 1000 : 0;
  const clickToConvRate =
    metrics.clicks > 0 ? (pipeline.leadsWithConversation / metrics.clicks) * 100 : 0;
  const costPerEngagement = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
  const roas = costPerClient && costPerClient > 0 ? 150 / costPerClient : 0;

  const metricsMap: Record<string, number> = {
    spend: metrics.spend,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    reach: metrics.reach,
    ctr: metrics.ctr,
    cpm: metrics.cpm,
    cpc: metrics.cpc,
    frequency,
    costPer1kReach,
    costPerLead: costPerLead ?? 0,
    costPerConversation: costPerConversation ?? 0,
    costPerClient: costPerClient ?? 0,
    conversations: pipeline.leadsWithConversation,
    clickToConvRate,
    costPerEngagement,
    engagements: metrics.clicks,
    totalLeads: pipeline.totalLeads,
    conversionRate: pipeline.conversionRate,
    clients: clientCount,
    roas,
  };

  const activeTips = insightConfig.tips.filter((tip) => tip.condition(metricsMap));

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-900">{insightConfig.title}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {insightConfig.metrics.map((m) => (
          <div key={m.key} className="bg-slate-50 rounded-xl p-3">
            <p className="text-[11px] text-slate-400">{m.label}</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {m.format(metricsMap[m.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>
      {activeTips.length > 0 && (
        <div className="space-y-2">
          {activeTips.slice(0, 3).map((tip, i) => (
            <StrategyInsight
              key={i}
              label={
                tip.status === "good"
                  ? "Positivo"
                  : tip.status === "ok"
                    ? "Atenção"
                    : "Ação necessária"
              }
              status={tip.status}
              detail={tip.text}
            />
          ))}
        </div>
      )}
    </div>
  );
}
