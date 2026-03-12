"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
        <span className="text-zinc-500">{label}</span>
        <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
      </div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

function CampaignCard({ campaign, totalSpend }: { campaign: MetaCampaign; totalSpend: number }) {
  const isActive = campaign.status === "ACTIVE";
  const shareOfSpend = totalSpend > 0 ? Math.round((campaign.spend / totalSpend) * 100) : 0;

  return (
    <Card className={isActive ? "border-blue-200 bg-blue-50/30" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold line-clamp-1">{campaign.name}</CardTitle>
          <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
          }`}>
            {isActive ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
            {isActive ? "Ativa" : "Pausada"}
          </span>
        </div>
        {shareOfSpend > 0 && <p className="text-xs text-zinc-400">{shareOfSpend}% do gasto total</p>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div><p className="text-xs text-zinc-500">Gasto</p><p className="text-base font-bold">{fmtBrl(campaign.spend)}</p></div>
          <div><p className="text-xs text-zinc-500">Impressões</p><p className="text-base font-bold">{campaign.impressions.toLocaleString("pt-BR")}</p></div>
          <div><p className="text-xs text-zinc-500">Cliques</p><p className="text-base font-bold">{campaign.clicks.toLocaleString("pt-BR")}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Thermometer label="CTR" value={`${fmt(campaign.ctr)}%`} quality={scoreCTR(campaign.ctr)} />
          <Thermometer label="CPM" value={fmtBrl(campaign.cpm)} quality={scoreCPM(campaign.cpm)} />
          <Thermometer label="CPC" value={fmtBrl(campaign.cpc)} quality={scoreCPC(campaign.cpc)} />
        </div>
      </CardContent>
    </Card>
  );
}

const STAGE_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];
const SOURCE_COLORS = ["#3b82f6", "#eab308", "#22c55e", "#8b5cf6", "#a1a1aa"];

export function AnalyticsClient({ data, sourceStats }: Props) {
  const { pipeline, metaAds, campaigns, hasMetaConfig, metaError, metaNoData } = data;
  const costPerLead = metaAds && pipeline.totalLeads > 0 ? metaAds.spend / pipeline.totalLeads : null;
  const costPerConversation = metaAds && pipeline.leadsWithConversation > 0 ? metaAds.spend / pipeline.leadsWithConversation : null;
  const scheduledCount = pipeline.funnelSteps[3]?.count ?? 0;
  const clientCount = pipeline.funnelSteps[4]?.count ?? 0;
  const costPerScheduled = metaAds && scheduledCount > 0 ? metaAds.spend / scheduledCount : null;
  const costPerClient = metaAds && clientCount > 0 ? metaAds.spend / clientCount : null;
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const sortedCampaigns = [...activeCampaigns, ...campaigns.filter((c) => c.status !== "ACTIVE")];

  // Chart data
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

  // Radar data for Meta quality
  const radarData = metaAds ? [
    { metric: "CTR", value: Math.min(metaAds.ctr / 3 * 100, 100), raw: `${fmt(metaAds.ctr)}%` },
    { metric: "Alcance", value: Math.min(metaAds.reach / Math.max(metaAds.impressions, 1) * 100, 100), raw: metaAds.reach.toLocaleString("pt-BR") },
    { metric: "CPC", value: Math.max(0, 100 - metaAds.cpc * 10), raw: fmtBrl(metaAds.cpc) },
    { metric: "CPM", value: Math.max(0, 100 - metaAds.cpm * 1.5), raw: fmtBrl(metaAds.cpm) },
    { metric: "Cliques", value: Math.min(metaAds.clicks / Math.max(pipeline.totalLeads, 1) * 20, 100), raw: metaAds.clicks.toLocaleString("pt-BR") },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-zinc-500">Funil completo: Meta Ads → WhatsApp → Clientes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total Leads", value: pipeline.totalLeads.toString(), icon: Users, color: "text-blue-600" },
          { label: "Conversas", value: pipeline.leadsWithConversation.toString(), icon: MessageCircle, color: "text-purple-600" },
          { label: "Taxa Conversão", value: `${pipeline.conversionRate}%`, icon: TrendingUp, color: "text-emerald-600" },
          { label: "Estágios Ativos", value: `${pipeline.leadsByStage.filter((s) => s.count > 0).length}`, icon: Target, color: "text-amber-600" },
          { label: "Gasto Meta", value: metaAds ? fmtBrl(metaAds.spend) : "—", icon: DollarSign, color: "text-red-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium text-zinc-500">{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1: Funnel + Source pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Funnel area chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e4e4e7" }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Funnel steps below */}
            <div className="space-y-2 mt-4 border-t border-zinc-100 pt-4">
              {pipeline.funnelSteps.map((step, i) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-1.5">
                      {i > 0 && <ArrowRight className="h-3 w-3 text-zinc-300" />}
                      <span className="font-medium">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{step.count} · {step.rate}%</span>
                      {metaAds && step.count > 0 && (
                        <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                          {fmtBrl(metaAds.spend / step.count)}/un
                        </span>
                      )}
                    </div>
                  </div>
                  <Progress value={step.rate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Source distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            {sourceChartData.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Sem dados</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {sourceChartData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {sourceChartData.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                        <span className="text-zinc-600">{s.name}</span>
                      </div>
                      <span className="font-medium">{s.value} ({sourceStats.total > 0 ? Math.round(s.value / sourceStats.total * 100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Stage bar chart + Radar quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads by stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads por Estágio</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageChartData} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                  {stageChartData.map((_, i) => (
                    <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meta quality radar */}
        {metaAds ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Qualidade Meta Ads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e4e4e7" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#71717a" }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(_: unknown, __: unknown, props: { payload?: { raw?: string } }) => props.payload?.raw ?? ""} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-4 mt-4 border-t border-zinc-100 pt-4">
                <Thermometer label="CTR médio" value={`${fmt(metaAds.ctr)}%`} quality={scoreCTR(metaAds.ctr)} />
                <Thermometer label="CPM médio" value={fmtBrl(metaAds.cpm)} quality={scoreCPM(metaAds.cpm)} />
                <Thermometer label="CPC médio" value={fmtBrl(metaAds.cpc)} quality={scoreCPC(metaAds.cpc)} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qualidade Meta Ads</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[260px]">
              {!hasMetaConfig ? (
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-zinc-600">Conecte o Meta Ads</p>
                  <p className="text-xs text-zinc-400">Configure em Configurações → Pixel do Facebook</p>
                </div>
              ) : metaError ? (
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-amber-700">Token expirado</p>
                  <p className="text-xs text-amber-600">Gere um novo token em Configurações</p>
                </div>
              ) : (
                <p className="text-sm text-zinc-400">Sem dados no período</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Meta Ads KPIs */}
      {metaAds && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Meta Ads — últimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                <div key={item.label} className="bg-zinc-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="h-3 w-3 text-zinc-400" />
                    <p className="text-[11px] text-zinc-500">{item.label}</p>
                  </div>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost per funnel step */}
      {metaAds && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo por etapa do funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Custo por Lead", value: costPerLead, highlight: false },
                { label: "Custo por Conversa", value: costPerConversation, highlight: false },
                { label: "Custo por Agendamento", value: costPerScheduled, highlight: false },
                { label: "Custo por Cliente", value: costPerClient, highlight: true },
              ].map((item) => (
                <div key={item.label} className={`rounded-lg p-3 ${item.highlight ? "bg-blue-50" : "bg-zinc-50"}`}>
                  <p className={`text-xs ${item.highlight ? "text-blue-600" : "text-zinc-500"}`}>{item.label}</p>
                  <p className={`text-lg font-bold ${item.highlight ? "text-blue-700" : ""}`}>
                    {item.value != null ? fmtBrl(item.value) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            Campanhas
            {activeCampaigns.length > 0 && (
              <span className="ml-2 text-xs font-normal text-emerald-600">
                {activeCampaigns.length} ativa{activeCampaigns.length > 1 ? "s" : ""}
              </span>
            )}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedCampaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} totalSpend={metaAds?.spend ?? 0} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
