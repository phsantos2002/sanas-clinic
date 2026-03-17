"use client";

import { useState, useTransition } from "react";
import { DollarSign, Eye, MousePointerClick, Users, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateCampaignBudget } from "@/app/actions/meta";
import {
  fmt, fmtBrl, BID_STRATEGIES, OBJECTIVES,
  type MetaCampaignFull,
} from "./shared";
import { Thermometer } from "./Thermometer";
import { classifyMetric, METRIC_COLORS, type BenchmarkMetrics } from "@/lib/benchmarks";

type CampaignKPIsProps = {
  campaign: MetaCampaignFull;
  benchmark?: BenchmarkMetrics | null;
};

export function CampaignKPIs({ campaign, benchmark }: CampaignKPIsProps) {
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

  // Use benchmark-aware quality or fallback to hardcoded
  function qualityCTR(ctr: number) {
    if (benchmark) {
      const q = classifyMetric("ctr", ctr, benchmark);
      return q === "good" ? "good" as const : q === "average" ? "ok" as const : "bad" as const;
    }
    return ctr >= 1.5 ? "good" as const : ctr >= 0.5 ? "ok" as const : "bad" as const;
  }
  function qualityCPM(cpm: number) {
    if (benchmark) {
      const q = classifyMetric("cpm", cpm, benchmark);
      return q === "good" ? "good" as const : q === "average" ? "ok" as const : "bad" as const;
    }
    return cpm <= 20 ? "good" as const : cpm <= 50 ? "ok" as const : "bad" as const;
  }
  function qualityCPC(cpc: number) {
    if (benchmark) {
      const q = classifyMetric("cpc", cpc, benchmark);
      return q === "good" ? "good" as const : q === "average" ? "ok" as const : "bad" as const;
    }
    return cpc <= 2 ? "good" as const : cpc <= 5 ? "ok" as const : "bad" as const;
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
          { label: "CTR", value: `${fmt(campaign.ctr)}%`, icon: Target, color: benchmark ? METRIC_COLORS[classifyMetric("ctr", campaign.ctr, benchmark)] : undefined },
          { label: "CPM", value: fmtBrl(campaign.cpm), icon: DollarSign, color: benchmark ? METRIC_COLORS[classifyMetric("cpm", campaign.cpm, benchmark)] : undefined },
          { label: "CPC", value: fmtBrl(campaign.cpc), icon: MousePointerClick, color: benchmark ? METRIC_COLORS[classifyMetric("cpc", campaign.cpc, benchmark)] : undefined },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl p-3">
            <div className="flex items-center gap-1 mb-0.5">
              <kpi.icon className="h-3 w-3 text-slate-400" />
              <p className="text-[10px] text-slate-400">{kpi.label}</p>
            </div>
            <p className={`text-sm font-bold ${"color" in kpi && kpi.color ? kpi.color : "text-slate-900"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Quality + Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-100 rounded-2xl shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-900">Qualidade dos Anúncios</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Thermometer label="CTR" value={`${fmt(campaign.ctr)}%`} quality={qualityCTR(campaign.ctr)} />
              <Thermometer label="CPM" value={fmtBrl(campaign.cpm)} quality={qualityCPM(campaign.cpm)} />
              <Thermometer label="CPC" value={fmtBrl(campaign.cpc)} quality={qualityCPC(campaign.cpc)} />
            </div>
            {benchmark && (
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-4 text-[10px] text-slate-400">
                <p>Ref: {`>${fmt(benchmark.ctr.good)}%`}</p>
                <p>Ref: {`<R$ ${fmt(benchmark.cpm.good)}`}</p>
                <p>Ref: {`<R$ ${fmt(benchmark.cpc.good)}`}</p>
              </div>
            )}
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
    </div>
  );
}
