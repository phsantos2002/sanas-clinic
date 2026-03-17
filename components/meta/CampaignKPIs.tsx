"use client";

import { useState, useTransition } from "react";
import {
  DollarSign, Eye, MousePointerClick, Users, Target, Info,
  TrendingUp, TrendingDown, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateCampaignBudget } from "@/app/actions/meta";
import {
  fmt, fmtBrl, scoreCTR, scoreCPM, scoreCPC,
  BID_STRATEGIES, OBJECTIVES,
  type MetaCampaignFull,
} from "./shared";
import { Thermometer } from "./Thermometer";

// ─── BidCapEducation ───

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

// ─── BidCapSimulator ───

function BidCapSimulator({ campaign }: { campaign: MetaCampaignFull }) {
  const [simValue, setSimValue] = useState("");
  const cpc = campaign.cpc;
  const cpm = campaign.cpm;
  const dailyBudget = campaign.dailyBudget ?? 0;

  const simBid = parseFloat(simValue) || 0;
  const hasSimulation = simBid > 0 && cpc > 0;

  const deliveryRatio = hasSimulation ? Math.min(simBid / cpc, 1.5) : 0;
  const estimatedClicks = hasSimulation && dailyBudget > 0
    ? Math.round((dailyBudget / Math.max(simBid, cpc * 0.5)) * deliveryRatio)
    : 0;
  const estimatedCost = hasSimulation ? Math.min(simBid, cpc * deliveryRatio) : 0;
  const estimatedImpressions = hasSimulation && cpm > 0
    ? Math.round(estimatedClicks / (Math.max(estimatedCost, 0.01) / (cpm / 1000)))
    : 0;

  const deliveryLabel = deliveryRatio >= 1.2 ? "Alta" : deliveryRatio >= 0.8 ? "Normal" : deliveryRatio >= 0.5 ? "Limitada" : "Muito baixa";
  const deliveryColor = deliveryRatio >= 1.2 ? "text-emerald-600" : deliveryRatio >= 0.8 ? "text-blue-600" : deliveryRatio >= 0.5 ? "text-amber-600" : "text-red-600";

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-500" />
          Simulador de Bid Cap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-slate-400">
          Simule um valor de bid cap e veja o impacto estimado na entrega da campanha.
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-slate-600">Valor do Bid Cap (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={simValue}
              onChange={(e) => setSimValue(e.target.value)}
              placeholder={cpc > 0 ? `CPC atual: ${fmt(cpc)}` : "Ex: 2.50"}
              className="text-sm rounded-xl"
            />
          </div>
        </div>

        {hasSimulation && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Entrega estimada</p>
                <p className={`text-sm font-bold ${deliveryColor}`}>{deliveryLabel}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">CPC estimado</p>
                <p className="text-sm font-bold text-slate-900">{fmtBrl(estimatedCost)}</p>
              </div>
              {dailyBudget > 0 && (
                <>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Cliques/dia estimados</p>
                    <p className="text-sm font-bold text-slate-900">~{estimatedClicks}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Impressões/dia estimadas</p>
                    <p className="text-sm font-bold text-slate-900">~{estimatedImpressions.toLocaleString("pt-BR")}</p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <p className="text-[10px] text-slate-500 font-medium">Comparação com CPC real</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-200 relative overflow-hidden">
                  <div className="absolute h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((cpc / Math.max(simBid, cpc) * 100), 100)}%` }} />
                </div>
                <span className="text-[10px] text-blue-600 font-medium w-16 text-right">CPC: {fmtBrl(cpc)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-slate-200 relative overflow-hidden">
                  <div className={`absolute h-full rounded-full ${simBid > cpc * 1.5 ? "bg-amber-400" : simBid < cpc * 0.7 ? "bg-red-400" : "bg-emerald-400"}`} style={{ width: `${Math.min((simBid / Math.max(simBid, cpc) * 100), 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-600 font-medium w-16 text-right">Bid: {fmtBrl(simBid)}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              {simBid < cpc * 0.7
                ? "Bid muito abaixo do CPC — entrega será significativamente reduzida."
                : simBid > cpc * 1.5
                ? "Bid muito acima do CPC — risco de pagar mais sem proporcionalidade."
                : "Bid dentro da faixa ideal — boa relação custo x entrega."
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── PerformanceTrend ───

function PerformanceTrend({ campaign }: { campaign: MetaCampaignFull }) {
  const cpc = campaign.cpc;
  const cpm = campaign.cpm;
  const ctr = campaign.ctr;
  const frequency = campaign.impressions > 0 && campaign.reach > 0
    ? campaign.impressions / campaign.reach
    : 0;

  const indicators: Array<{ label: string; status: "healthy" | "warning" | "critical"; detail: string }> = [];

  if (ctr >= 1.5) {
    indicators.push({ label: "Engajamento", status: "healthy", detail: `CTR de ${fmt(ctr)}% — audiência engajada` });
  } else if (ctr >= 0.5) {
    indicators.push({ label: "Engajamento", status: "warning", detail: `CTR de ${fmt(ctr)}% — há espaço para otimizar criativos` });
  } else {
    indicators.push({ label: "Engajamento", status: "critical", detail: `CTR de ${fmt(ctr)}% — criativos precisam de revisão urgente` });
  }

  if (frequency > 0) {
    if (frequency <= 2) {
      indicators.push({ label: "Saturação", status: "healthy", detail: `Freq. ${fmt(frequency, 1)}x — público recebendo na medida` });
    } else if (frequency <= 3.5) {
      indicators.push({ label: "Saturação", status: "warning", detail: `Freq. ${fmt(frequency, 1)}x — audiência vendo os anúncios com repetição` });
    } else {
      indicators.push({ label: "Saturação", status: "critical", detail: `Freq. ${fmt(frequency, 1)}x — público saturado, renove criativos` });
    }
  }

  if (cpc > 0) {
    if (cpc <= 2) {
      indicators.push({ label: "Custo por Clique", status: "healthy", detail: `CPC de ${fmtBrl(cpc)} — eficiente` });
    } else if (cpc <= 5) {
      indicators.push({ label: "Custo por Clique", status: "warning", detail: `CPC de ${fmtBrl(cpc)} — moderado, busque otimizar` });
    } else {
      indicators.push({ label: "Custo por Clique", status: "critical", detail: `CPC de ${fmtBrl(cpc)} — alto, revise segmentação e criativos` });
    }
  }

  if (cpm > 0) {
    if (cpm <= 20) {
      indicators.push({ label: "Custo de Alcance", status: "healthy", detail: `CPM de ${fmtBrl(cpm)} — boa visibilidade por custo baixo` });
    } else if (cpm <= 50) {
      indicators.push({ label: "Custo de Alcance", status: "warning", detail: `CPM de ${fmtBrl(cpm)} — concorrência moderada no leilão` });
    } else {
      indicators.push({ label: "Custo de Alcance", status: "critical", detail: `CPM de ${fmtBrl(cpm)} — custo alto, teste públicos diferentes` });
    }
  }

  const healthyCount = indicators.filter((i) => i.status === "healthy").length;
  const criticalCount = indicators.filter((i) => i.status === "critical").length;
  const overallHealth = criticalCount >= 2 ? "critical" : criticalCount >= 1 ? "warning" : healthyCount >= 3 ? "healthy" : "warning";

  const statusConfig = {
    healthy: { label: "Saudável", color: "text-emerald-700", bg: "bg-emerald-50", icon: TrendingUp },
    warning: { label: "Atenção", color: "text-amber-700", bg: "bg-amber-50", icon: Activity },
    critical: { label: "Crítico", color: "text-red-700", bg: "bg-red-50", icon: TrendingDown },
  };

  const overall = statusConfig[overallHealth];
  const OverallIcon = overall.icon;

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-500" />
            Saúde da Campanha
          </CardTitle>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${overall.bg} ${overall.color}`}>
            <OverallIcon className="h-3 w-3" />
            {overall.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {indicators.map((ind) => {
          const cfg = statusConfig[ind.status];
          const IndIcon = cfg.icon;
          return (
            <div key={ind.label} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${cfg.bg}`}>
              <IndIcon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
              <div>
                <p className={`text-xs font-semibold ${cfg.color}`}>{ind.label}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{ind.detail}</p>
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {overallHealth === "healthy"
              ? "A campanha está com bons indicadores. Mantenha os criativos atualizados e monitore a frequência para evitar saturação."
              : overallHealth === "warning"
              ? "Alguns indicadores precisam de atenção. Foque em otimizar os criativos e considere ajustar o público-alvo ou o bid cap."
              : "A campanha precisa de ajustes urgentes. Revise criativos, segmentação e estratégia de lance antes de continuar investindo."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CampaignKPIs (main export) ───

type CampaignKPIsProps = {
  campaign: MetaCampaignFull;
};

export function CampaignKPIs({ campaign }: CampaignKPIsProps) {
  const [editBudget, setEditBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(campaign.dailyBudget?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  async function handleSaveBudget() {
    const val = parseFloat(budgetValue);
    if (isNaN(val) || val <= 0) { toast.error("Valor inválido"); return; }
    startTransition(async () => {
      const result = await updateCampaignBudget(campaign.id, val);
      if (result.success) { toast.success("Orçamento atualizado"); setEditBudget(false); }
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Campaign KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Gasto", value: fmtBrl(campaign.spend), icon: DollarSign },
          { label: "Impressões", value: campaign.impressions.toLocaleString("pt-BR"), icon: Eye },
          { label: "Cliques", value: campaign.clicks.toLocaleString("pt-BR"), icon: MousePointerClick },
          { label: "Alcance", value: campaign.reach.toLocaleString("pt-BR"), icon: Users },
          { label: "CTR", value: `${fmt(campaign.ctr)}%`, icon: Target },
          { label: "CPM", value: fmtBrl(campaign.cpm), icon: DollarSign },
          { label: "CPC", value: fmtBrl(campaign.cpc), icon: MousePointerClick },
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
        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900">Qualidade dos Anúncios</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Thermometer label="CTR" value={`${fmt(campaign.ctr)}%`} quality={scoreCTR(campaign.ctr)} />
              <Thermometer label="CPM" value={fmtBrl(campaign.cpm)} quality={scoreCPM(campaign.cpm)} />
              <Thermometer label="CPC" value={fmtBrl(campaign.cpc)} quality={scoreCPC(campaign.cpc)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900">Orçamento & Estratégia</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Objetivo</p>
                <p className="text-sm font-semibold text-slate-900">{OBJECTIVES[campaign.objective] ?? campaign.objective}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400">Estratégia de Lance</p>
                <p className="text-sm font-semibold text-blue-700">{campaign.bidStrategy ? BID_STRATEGIES[campaign.bidStrategy] ?? campaign.bidStrategy : "Padrão"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-slate-500">Orçamento diário</p>
                <p className="text-lg font-bold text-slate-900">{campaign.dailyBudget != null ? fmtBrl(campaign.dailyBudget) : "Não definido"}</p>
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
      <BidCapEducation campaign={campaign} />

      {/* Bid Cap Simulator + Performance Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BidCapSimulator campaign={campaign} />
        <PerformanceTrend campaign={campaign} />
      </div>
    </div>
  );
}
