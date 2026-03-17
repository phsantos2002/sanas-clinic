"use client";

import { AlertTriangle, BookOpen, TrendingDown, DollarSign, Users } from "lucide-react";
import type { MetaCampaignFull } from "./shared";
import { fmt, fmtBrl } from "./shared";
import { getMetricStatus, type BenchmarkMetrics } from "@/lib/benchmarks";
import type { CampaignConfig } from "@/types";

type Props = {
  campaign: MetaCampaignFull;
  config: CampaignConfig;
  benchmark: BenchmarkMetrics;
};

type CampaignAlert = {
  type: "warning" | "critical" | "info";
  title: string;
  description: string;
};

export function CampaignAlerts({ campaign, config, benchmark }: Props) {
  const alerts: CampaignAlert[] = [];
  const frequency = campaign.impressions > 0 && campaign.reach > 0
    ? campaign.impressions / campaign.reach : 0;

  // Learning phase detection
  if (campaign.impressions < 500 && campaign.status === "ACTIVE") {
    alerts.push({
      type: "info",
      title: "Fase de Aprendizado",
      description: `A campanha tem apenas ${campaign.impressions.toLocaleString("pt-BR")} impressões. A Meta precisa de ~500+ impressões para otimizar a entrega. Evite alterações nos próximos 3-5 dias.`,
    });
  }

  // Bad CTR
  if (campaign.impressions > 1000 && getMetricStatus("ctr", campaign.ctr, benchmark) === "bad") {
    alerts.push({
      type: "critical",
      title: `CTR muito baixo (${fmt(campaign.ctr)}%)`,
      description: "O público não está engajando. Revise criativos, teste novos formatos e refine a segmentação.",
    });
  }

  // Bad CPM
  if (campaign.impressions > 1000 && getMetricStatus("cpm", campaign.cpm, benchmark) === "bad") {
    alerts.push({
      type: "warning",
      title: `CPM elevado (${fmtBrl(campaign.cpm)})`,
      description: "Custo de alcance alto. Pode indicar público saturado ou concorrência elevada. Expanda a segmentação.",
    });
  }

  // High frequency
  if (frequency > benchmark.frequency.average) {
    alerts.push({
      type: "warning",
      title: `Frequência alta (${fmt(frequency, 1)}x)`,
      description: `Acima de ${fmt(benchmark.frequency.average, 1)}x. O público já viu os anúncios muitas vezes. Renove criativos ou expanda o público.`,
    });
  }

  // Budget warning (monthly budget configured but spend is running out)
  if (config.monthlyBudget && config.monthlyBudget > 0) {
    const dailyBudgetEstimate = config.monthlyBudget / 30;
    const daysRunning = campaign.spend > 0 ? campaign.spend / dailyBudgetEstimate : 0;
    if (daysRunning > 25) {
      alerts.push({
        type: "warning",
        title: "Verba mensal quase esgotada",
        description: `Gasto de ${fmtBrl(campaign.spend)} de ${fmtBrl(config.monthlyBudget)} previstos. Considere pausar ou reduzir o orçamento diário.`,
      });
    }
  }

  // Cost Cap/Bid Cap over limit
  if ((config.bidStrategy === "COST_CAP" || config.bidStrategy === "BID_CAP") && config.maxCostPerResult) {
    if (campaign.cpc > config.maxCostPerResult * 1.2) {
      alerts.push({
        type: "critical",
        title: "CPC acima do limite configurado",
        description: `CPC real (${fmtBrl(campaign.cpc)}) está 20%+ acima do cap (${fmtBrl(config.maxCostPerResult)}). A entrega pode ser limitada.`,
      });
    }
  }

  if (alerts.length === 0) return null;

  const typeConfig = {
    critical: { bg: "bg-red-50", border: "border-l-red-400", icon: TrendingDown, iconColor: "text-red-500" },
    warning: { bg: "bg-amber-50", border: "border-l-amber-400", icon: AlertTriangle, iconColor: "text-amber-500" },
    info: { bg: "bg-blue-50", border: "border-l-blue-400", icon: BookOpen, iconColor: "text-blue-500" },
  };

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const tc = typeConfig[alert.type];
        const Icon = tc.icon;
        return (
          <div key={i} className={`rounded-xl p-3 border-l-4 ${tc.bg} ${tc.border}`}>
            <div className="flex items-start gap-2">
              <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${tc.iconColor}`} />
              <div>
                <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{alert.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
