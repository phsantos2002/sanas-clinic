"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users, TrendingUp, Target, MessageCircle, ArrowRight,
  DollarSign, MousePointerClick, Eye, Zap, ZapOff,
} from "lucide-react";
import { MetaIcon, GoogleAdsIcon } from "@/components/icons/SourceIcons";
import type { FullAnalytics } from "@/app/actions/analytics";
import type { LeadSourceStats } from "@/types";
import type { MetaCampaign } from "@/services/metaAds";

type Props = {
  data: FullAnalytics;
  sourceStats: LeadSourceStats;
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtBrl(n: number) {
  return `R$ ${fmt(n)}`;
}

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

function CampaignCard({ campaign, totalSpend }: { campaign: MetaCampaign; totalSpend: number }) {
  const isActive = campaign.status === "ACTIVE";
  const shareOfSpend = totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0;

  return (
    <div className={`bg-white border rounded-2xl p-5 space-y-4 ${isActive ? "border-blue-200" : "border-slate-100"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 line-clamp-1">{campaign.name}</p>
        <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
          isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          {isActive ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
          {isActive ? "Ativa" : "Pausada"}
        </span>
      </div>
      {shareOfSpend > 0 && <p className="text-xs text-slate-400">{shareOfSpend}% do gasto total</p>}
      <div className="grid grid-cols-3 gap-3">
        <div><p className="text-[11px] text-slate-400">Gasto</p><p className="text-base font-bold text-slate-900">{fmtBrl(campaign.spend)}</p></div>
        <div><p className="text-[11px] text-slate-400">Impressões</p><p className="text-base font-bold text-slate-900">{campaign.impressions.toLocaleString("pt-BR")}</p></div>
        <div><p className="text-[11px] text-slate-400">Cliques</p><p className="text-base font-bold text-slate-900">{campaign.clicks.toLocaleString("pt-BR")}</p></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Thermometer label="CTR" value={`${fmt(campaign.ctr)}%`} quality={scoreCTR(campaign.ctr)} />
        <Thermometer label="CPM" value={fmtBrl(campaign.cpm)} quality={scoreCPM(campaign.cpm)} />
        <Thermometer label="CPC" value={fmtBrl(campaign.cpc)} quality={scoreCPC(campaign.cpc)} />
      </div>
    </div>
  );
}

const STAGE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
const SOURCE_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#8b5cf6", "#a1a1aa"];

export function AnalyticsClient({ data, sourceStats }: Props) {
  const { pipeline, metaAds, campaigns, hasMetaConfig, metaError } = data;
  const costPerLead = metaAds && pipeline.totalLeads > 0 ? metaAds.spend / pipeline.totalLeads : null;
  const costPerConversation = metaAds && pipeline.leadsWithConversation > 0 ? metaAds.spend / pipeline.leadsWithConversation : null;
  const scheduledCount = pipeline.funnelSteps[3]?.count ?? 0;
  const clientCount = pipeline.funnelSteps[4]?.count ?? 0;
  const costPerScheduled = metaAds && scheduledCount > 0 ? metaAds.spend / scheduledCount : null;
  const costPerClient = metaAds && clientCount > 0 ? metaAds.spend / clientCount : null;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const sortedCampaigns = [...activeCampaigns, ...campaigns.filter((c) => c.status !== "ACTIVE")];

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

  const radarData = metaAds ? [
    { metric: "CTR", value: Math.min(metaAds.ctr / 3 * 100, 100), raw: `${fmt(metaAds.ctr)}%` },
    { metric: "Alcance", value: Math.min(metaAds.reach / Math.max(metaAds.impressions, 1) * 100, 100), raw: metaAds.reach.toLocaleString("pt-BR") },
    { metric: "CPC", value: Math.max(0, 100 - metaAds.cpc * 10), raw: fmtBrl(metaAds.cpc) },
    { metric: "CPM", value: Math.max(0, 100 - metaAds.cpm * 1.5), raw: fmtBrl(metaAds.cpm) },
    { metric: "Cliques", value: Math.min(metaAds.clicks / Math.max(pipeline.totalLeads, 1) * 20, 100), raw: metaAds.clicks.toLocaleString("pt-BR") },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Funil completo: Anúncios → WhatsApp → Clientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Leads", value: pipeline.totalLeads.toString(), icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Conversas", value: pipeline.leadsWithConversation.toString(), icon: MessageCircle, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Taxa Conversão", value: `${pipeline.conversionRate}%`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Estágios Ativos", value: `${pipeline.leadsByStage.filter((s) => s.count > 0).length}`, icon: Target, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Gasto Meta", value: metaAds ? fmtBrl(metaAds.spend) : "—", icon: DollarSign, color: "text-red-600", bg: "bg-red-50" },
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

      {/* ============== FUNIL DE CONVERSÃO ============== */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
          Funil de Conversão
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Funnel area chart */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4 border-t border-slate-100 pt-4">
              {pipeline.funnelSteps.map((step, i) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-1.5">
                      {i > 0 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                      <span className="font-medium text-slate-700">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{step.count} · {step.rate}%</span>
                      {metaAds && step.count > 0 && (
                        <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-lg">
                          {fmtBrl(metaAds.spend / step.count)}/un
                        </span>
                      )}
                    </div>
                  </div>
                  <Progress value={step.rate} className="h-2" />
                </div>
              ))}
            </div>
          </div>

          {/* Source pie + Leads by stage */}
          <div className="space-y-4">
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
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                          <span className="text-slate-600">{s.name}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{s.value} ({sourceStats.total > 0 ? Math.round(s.value / sourceStats.total * 100) : 0}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leads by stage */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Leads por Estágio do Pipeline</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stageChartData} layout="vertical" barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Bar dataKey="leads" radius={[0, 8, 8, 0]}>
              {stageChartData.map((_, i) => (
                <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ============== META ADS ============== */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <MetaIcon size={16} />
          </div>
          Meta Ads
        </h2>

        {metaAds ? (
          <div className="space-y-4">
            {/* KPIs */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Últimos 30 dias</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {[
                  { label: "Gasto", value: fmtBrl(metaAds.spend), icon: DollarSign },
                  { label: "Impressões", value: metaAds.impressions.toLocaleString("pt-BR"), icon: Eye },
                  { label: "Cliques", value: metaAds.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
                  { label: "Alcance", value: metaAds.reach.toLocaleString("pt-BR"), icon: Users },
                  { label: "Custo/Lead", value: costPerLead != null ? fmtBrl(costPerLead) : "—", icon: Target },
                  { label: "Custo/Conversa", value: costPerConversation != null ? fmtBrl(costPerConversation) : "—", icon: MessageCircle },
                  { label: "Custo/Cliente", value: costPerClient != null ? fmtBrl(costPerClient) : "—", icon: TrendingUp },
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

            {/* Quality radar + cost per step */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Qualidade dos Anúncios</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                    <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} formatter={(_: unknown, __: unknown, props: { payload?: { raw?: string } }) => props.payload?.raw ?? ""} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 mt-4 border-t border-slate-100 pt-4">
                  <Thermometer label="CTR médio" value={`${fmt(metaAds.ctr)}%`} quality={scoreCTR(metaAds.ctr)} />
                  <Thermometer label="CPM médio" value={fmtBrl(metaAds.cpm)} quality={scoreCPM(metaAds.cpm)} />
                  <Thermometer label="CPC médio" value={fmtBrl(metaAds.cpc)} quality={scoreCPC(metaAds.cpc)} />
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Custo por Etapa do Funil</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Custo por Lead", value: costPerLead },
                    { label: "Custo por Conversa", value: costPerConversation },
                    { label: "Custo por Agendamento", value: costPerScheduled },
                    { label: "Custo por Cliente", value: costPerClient, highlight: true },
                  ].map((item) => (
                    <div key={item.label} className={`rounded-xl p-4 ${"highlight" in item && item.highlight ? "bg-blue-50 border border-blue-100" : "bg-slate-50"}`}>
                      <p className={`text-xs ${"highlight" in item && item.highlight ? "text-blue-600" : "text-slate-500"}`}>{item.label}</p>
                      <p className={`text-xl font-bold mt-1 ${"highlight" in item && item.highlight ? "text-blue-700" : "text-slate-900"}`}>
                        {item.value != null ? fmtBrl(item.value) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaigns */}
            {campaigns.length > 0 && (
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
                    <CampaignCard key={c.id} campaign={c} totalSpend={metaAds?.spend ?? 0} />
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
                <p className="text-xs text-slate-400">Configure em Configurações → Pixel do Facebook</p>
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

      {/* ============== GOOGLE ADS ============== */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
            <GoogleAdsIcon size={16} />
          </div>
          Google Ads
        </h2>

        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
              <GoogleAdsIcon size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700">Google Ads — Em Breve</p>
            <p className="text-xs text-slate-400">
              Leads vindos do Google ({sourceStats.google}) são rastreados automaticamente.
              <br />
              Métricas detalhadas de campanhas estarão disponíveis em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
