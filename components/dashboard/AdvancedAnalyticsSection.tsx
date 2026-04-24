"use client";

import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  Flame,
  Snowflake,
  Zap,
  Crown,
  Clock,
  BarChart3,
  Bot,
} from "lucide-react";
import type { FunnelStep, LTVData, CACData, AIUsageReport } from "@/app/actions/advancedAnalytics";

const SOURCE_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google",
  whatsapp: "WhatsApp",
  manual: "Manual",
  desconhecido: "Desconhecido",
};

export function AdvancedAnalyticsSection({
  funnel,
  ltv,
  cac,
  aiUsage,
}: {
  funnel: FunnelStep[];
  ltv: LTVData[];
  cac: CACData[];
  aiUsage: AIUsageReport;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Analytics Avancado</h2>
        <p className="text-xs text-slate-400 mt-0.5">Metricas detalhadas do seu negocio</p>
      </div>

      {/* Funnel */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-slate-400" /> Funil de Conversao
        </h3>
        {funnel.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sem dados de funil</p>
        ) : (
          <div className="space-y-2">
            {funnel.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-28 text-xs text-slate-600 font-medium truncate">
                  {step.stageName}
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(step.percentage, 5)}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{step.count}</span>
                    </div>
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-xs font-semibold text-slate-700">{step.percentage}%</span>
                </div>
                <div className="w-20 text-right">
                  {step.avgDaysFromPrevious !== null && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 justify-end">
                      <Clock className="h-2.5 w-2.5" />
                      {step.avgDaysFromPrevious}d
                    </span>
                  )}
                </div>
                <div className="w-14 text-right">
                  {step.dropoffRate > 0 && (
                    <span className="text-[10px] text-red-500">-{step.dropoffRate}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LTV by Source */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-500" /> LTV por Canal
          </h3>
          {ltv.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {ltv.map((item) => (
                <div
                  key={item.source}
                  className="flex items-center justify-between bg-slate-50 rounded-xl p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {SOURCE_LABELS[item.source] || item.source}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.totalLeads} leads → {item.clients} clientes ({item.conversionRate}%)
                    </p>
                  </div>
                  <p className="text-sm font-bold text-green-700">
                    R$ {item.estimatedLTV.toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CAC + ROAS */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" /> CAC & ROAS por Canal
          </h3>
          {cac.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem dados</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-100">
                    <th className="pb-2 text-left font-medium">Canal</th>
                    <th className="pb-2 text-right font-medium">Gasto</th>
                    <th className="pb-2 text-right font-medium">CPL</th>
                    <th className="pb-2 text-right font-medium">CPA</th>
                    <th className="pb-2 text-right font-medium">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {cac.map((item) => (
                    <tr key={item.channel} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700">
                        {SOURCE_LABELS[item.channel] || item.channel}
                      </td>
                      <td className="py-2 text-right text-slate-500">R$ {item.spend.toFixed(0)}</td>
                      <td className="py-2 text-right text-slate-600">
                        R$ {item.costPerLead.toFixed(2)}
                      </td>
                      <td className="py-2 text-right text-slate-600">
                        R$ {item.costPerClient.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 text-right font-bold ${item.roas >= 3 ? "text-green-600" : item.roas >= 1 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {item.roas > 0 ? `${item.roas}x` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* AI Usage */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500" /> Uso de IA (30 dias)
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-violet-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-violet-700">{aiUsage.totalOperations}</p>
              <p className="text-[10px] text-violet-500">Operacoes</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-700">
                R$ {(aiUsage.totalCostUsd * 5.8).toFixed(2)}
              </p>
              <p className="text-[10px] text-green-500">Custo Total</p>
            </div>
          </div>
          {aiUsage.byOperation.length > 0 && (
            <div className="space-y-1.5">
              {aiUsage.byOperation.map((op) => (
                <div key={op.operation} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    {op.operation} ({op.count}x)
                  </span>
                  <span className="text-slate-400">R$ {(op.costUsd * 5.8).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* IA Insights */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" /> Insights da IA
        </h3>
        <div className="space-y-2">
          {generateInsights(funnel, ltv, cac).map((insight, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
              <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
              <p className="text-sm text-amber-800">{insight}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generateInsights(funnel: FunnelStep[], ltv: LTVData[], cac: CACData[]): string[] {
  const insights: string[] = [];

  // Funnel insights
  const worstDropoff = funnel.reduce(
    (worst, step) => (step.dropoffRate > (worst?.dropoffRate || 0) ? step : worst),
    funnel[0]
  );
  if (worstDropoff && worstDropoff.dropoffRate > 30) {
    insights.push(
      `Maior gargalo no funil: "${worstDropoff.stageName}" com ${worstDropoff.dropoffRate}% de perda. Foque em melhorar essa etapa.`
    );
  }

  const slowestStep = funnel.reduce(
    (slow, step) =>
      (step.avgDaysFromPrevious || 0) > (slow?.avgDaysFromPrevious || 0) ? step : slow,
    funnel[0]
  );
  if (slowestStep?.avgDaysFromPrevious && slowestStep.avgDaysFromPrevious > 3) {
    insights.push(
      `A etapa "${slowestStep.stageName}" demora em media ${slowestStep.avgDaysFromPrevious} dias. Considere automacoes para acelerar.`
    );
  }

  // LTV insights
  if (ltv.length >= 2) {
    const sorted = [...ltv].sort((a, b) => b.conversionRate - a.conversionRate);
    if (sorted[0].conversionRate > sorted[1].conversionRate * 1.3) {
      insights.push(
        `Leads de "${sorted[0].source}" convertem ${Math.round(sorted[0].conversionRate / (sorted[1].conversionRate || 1))}x mais que "${sorted[1].source}". Priorize esse canal.`
      );
    }
  }

  // CAC insights
  const bestROAS = cac.reduce((best, ch) => (ch.roas > (best?.roas || 0) ? ch : best), cac[0]);
  if (bestROAS && bestROAS.roas > 2) {
    insights.push(
      `Melhor ROAS: canal "${bestROAS.channel}" com ${bestROAS.roas}x de retorno. Considere aumentar investimento.`
    );
  }

  if (insights.length === 0) {
    insights.push("Continue alimentando o sistema com dados para receber insights personalizados.");
  }

  return insights;
}
