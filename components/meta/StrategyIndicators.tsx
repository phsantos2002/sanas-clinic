"use client";

import { useState } from "react";
import { TrendingDown, TrendingUp, Activity, Target, DollarSign, Info, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getBenchmark,
  classifyMetric,
  METRIC_COLORS,
  type BenchmarkMetrics,
} from "@/lib/benchmarks";
import { fmt, fmtBrl, type MetaCampaignFull } from "./shared";

type StrategyProps = {
  campaign: MetaCampaignFull;
  objective: string | null;
  segment: string | null;
  coverage: string | null;
  maxCostPerResult?: number | null;
  conversionValue?: number | null;
  bidValue?: number | null;
};

// ─── Shared metric row ───

function MetricRow({
  label,
  value,
  formatted,
  metric,
  benchmark,
}: {
  label: string;
  value: number;
  formatted: string;
  metric: keyof BenchmarkMetrics;
  benchmark: BenchmarkMetrics;
}) {
  const quality = classifyMetric(metric, value, benchmark);
  const color = METRIC_COLORS[quality];
  const thresholds = benchmark[metric];
  const isHigherBetter = metric === "ctr";

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-xs text-slate-600">{label}</p>
        <p className="text-[10px] text-slate-400">
          Ref: {isHigherBetter ? `>${fmt(thresholds.good)}` : `<${fmt(thresholds.good)}`} bom
          {" / "}
          {isHigherBetter ? `<${fmt(thresholds.bad)}` : `>${fmt(thresholds.bad)}`} ruim
        </p>
      </div>
      <p className={`text-sm font-bold ${color}`}>{formatted}</p>
    </div>
  );
}

// ─── 1) Lowest Cost ───

export function LowestCostIndicators({ campaign, objective, segment, coverage }: StrategyProps) {
  const bench = getBenchmark(objective, segment, coverage);
  const frequency =
    campaign.impressions > 0 && campaign.reach > 0 ? campaign.impressions / campaign.reach : 0;

  return (
    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-green-50/20 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-600" />
          Menor Custo — Indicadores
        </CardTitle>
        <p className="text-[10px] text-emerald-700/60">
          Foco em volume: a Meta otimiza automaticamente para obter o máximo de resultados pelo
          menor custo possível.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        <MetricRow
          label="CTR"
          value={campaign.ctr}
          formatted={`${fmt(campaign.ctr)}%`}
          metric="ctr"
          benchmark={bench}
        />
        <MetricRow
          label="CPM"
          value={campaign.cpm}
          formatted={fmtBrl(campaign.cpm)}
          metric="cpm"
          benchmark={bench}
        />
        <MetricRow
          label="CPC"
          value={campaign.cpc}
          formatted={fmtBrl(campaign.cpc)}
          metric="cpc"
          benchmark={bench}
        />
        <MetricRow
          label="Frequência"
          value={frequency}
          formatted={`${fmt(frequency, 1)}x`}
          metric="frequency"
          benchmark={bench}
        />

        <div className="pt-2 text-[10px] text-slate-500 space-y-1 border-t border-emerald-100">
          <p>
            <strong>Dica:</strong> Com Menor Custo, monitore o CPM e a frequência. Se o CPM subir,
            expanda o público. Se a frequência passar de {bench.frequency.average}x, renove
            criativos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 2) Cost Cap ───

export function CostCapIndicators({
  campaign,
  objective,
  segment,
  coverage,
  maxCostPerResult,
}: StrategyProps) {
  const bench = getBenchmark(objective, segment, coverage);
  const frequency =
    campaign.impressions > 0 && campaign.reach > 0 ? campaign.impressions / campaign.reach : 0;
  const cpl = campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0; // simplified CPL

  const capSet = maxCostPerResult && maxCostPerResult > 0;
  const overCap = capSet && cpl > maxCostPerResult!;

  return (
    <Card className="border-blue-100 bg-gradient-to-br from-blue-50/40 to-indigo-50/20 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-blue-600" />
          Cost Cap — Indicadores
        </CardTitle>
        <p className="text-[10px] text-blue-700/60">
          Foco em eficiência: a Meta mantém o custo médio por resultado dentro do limite definido.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        <MetricRow
          label="CPC"
          value={campaign.cpc}
          formatted={fmtBrl(campaign.cpc)}
          metric="cpc"
          benchmark={bench}
        />
        <MetricRow
          label="CPM"
          value={campaign.cpm}
          formatted={fmtBrl(campaign.cpm)}
          metric="cpm"
          benchmark={bench}
        />
        <MetricRow
          label="CTR"
          value={campaign.ctr}
          formatted={`${fmt(campaign.ctr)}%`}
          metric="ctr"
          benchmark={bench}
        />
        <MetricRow
          label="Frequência"
          value={frequency}
          formatted={`${fmt(frequency, 1)}x`}
          metric="frequency"
          benchmark={bench}
        />

        {capSet && (
          <div
            className={`mt-2 p-3 rounded-xl border ${overCap ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}
          >
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold">
                  Cap: {fmtBrl(maxCostPerResult!)} | CPC real: {fmtBrl(campaign.cpc)}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  {overCap
                    ? "CPC acima do cap — a Meta pode reduzir a entrega. Considere aumentar o cap ou otimizar criativos."
                    : "CPC dentro do cap — boa eficiência. A campanha está entregando normalmente."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 text-[10px] text-slate-500 space-y-1 border-t border-blue-100">
          <p>
            <strong>Dica:</strong> Se a entrega cair, aumente o Cost Cap em 10-20%. Se o CPC ficar
            muito abaixo do cap, reduza gradualmente para encontrar o equilíbrio ideal.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 3) Bid Cap ───

export function BidCapIndicators({
  campaign,
  objective,
  segment,
  coverage,
  maxCostPerResult,
  bidValue,
}: StrategyProps) {
  const bench = getBenchmark(objective, segment, coverage);
  const frequency =
    campaign.impressions > 0 && campaign.reach > 0 ? campaign.impressions / campaign.reach : 0;
  const [simValue, setSimValue] = useState("");
  const cpc = campaign.cpc;

  const simBid = parseFloat(simValue) || 0;
  const hasSimulation = simBid > 0 && cpc > 0;
  const deliveryRatio = hasSimulation ? Math.min(simBid / cpc, 1.5) : 0;
  const deliveryLabel =
    deliveryRatio >= 1.2
      ? "Alta"
      : deliveryRatio >= 0.8
        ? "Normal"
        : deliveryRatio >= 0.5
          ? "Limitada"
          : "Muito baixa";
  const deliveryColor =
    deliveryRatio >= 1.2
      ? "text-emerald-600"
      : deliveryRatio >= 0.8
        ? "text-blue-600"
        : deliveryRatio >= 0.5
          ? "text-amber-600"
          : "text-red-600";

  const suggestedMin = cpc > 0 ? Math.max(0.01, cpc * 0.8) : null;
  const suggestedMax = cpc > 0 ? cpc * 1.5 : null;
  const suggestedIdeal = cpc > 0 ? cpc * 1.1 : null;

  return (
    <Card className="border-violet-100 bg-gradient-to-br from-violet-50/40 to-purple-50/20 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-violet-900 flex items-center gap-2">
          <Target className="h-4 w-4 text-violet-600" />
          Bid Cap — Indicadores
        </CardTitle>
        <p className="text-[10px] text-violet-700/60">
          Controle de lance: define o valor máximo por leilão. Ideal para controlar custo com
          precisão.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricRow
          label="CPC"
          value={campaign.cpc}
          formatted={fmtBrl(campaign.cpc)}
          metric="cpc"
          benchmark={bench}
        />
        <MetricRow
          label="CPM"
          value={campaign.cpm}
          formatted={fmtBrl(campaign.cpm)}
          metric="cpm"
          benchmark={bench}
        />
        <MetricRow
          label="CTR"
          value={campaign.ctr}
          formatted={`${fmt(campaign.ctr)}%`}
          metric="ctr"
          benchmark={bench}
        />
        <MetricRow
          label="Frequência"
          value={frequency}
          formatted={`${fmt(frequency, 1)}x`}
          metric="frequency"
          benchmark={bench}
        />

        {suggestedMin != null && suggestedMax != null && suggestedIdeal != null && (
          <div className="bg-white rounded-xl p-3 border border-violet-200 space-y-2">
            <p className="text-[10px] font-semibold text-violet-900">Faixa recomendada de Bid</p>
            <div className="h-2.5 rounded-full bg-gradient-to-r from-red-200 via-emerald-300 to-amber-200 relative">
              <div
                className="absolute top-[-2px] w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
                style={{ left: `calc(50% - 7px)` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-red-600">{fmtBrl(suggestedMin)}</span>
              <span className="text-emerald-600">{fmtBrl(suggestedIdeal)}</span>
              <span className="text-amber-600">{fmtBrl(suggestedMax)}</span>
            </div>
            {bidValue && bidValue > 0 && (
              <p className="text-[10px] text-slate-600">
                Seu lance atual: <strong>{fmtBrl(bidValue)}</strong>
                {bidValue < suggestedMin
                  ? " — muito baixo, risco de entrega limitada"
                  : bidValue > suggestedMax
                    ? " — acima do recomendado, otimize para reduzir"
                    : " — dentro da faixa ideal"}
              </p>
            )}
          </div>
        )}

        {/* Mini simulator */}
        <div className="pt-2 border-t border-violet-100 space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-slate-500">Simular bid (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={simValue}
                onChange={(e) => setSimValue(e.target.value)}
                placeholder={cpc > 0 ? `CPC: ${fmt(cpc)}` : "Ex: 2.50"}
                className="h-7 text-xs rounded-lg"
              />
            </div>
            {hasSimulation && (
              <p className={`text-xs font-bold ${deliveryColor} pb-1`}>{deliveryLabel}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 4) ROAS Min ───

export function RoasMinIndicators({
  campaign,
  objective,
  segment,
  coverage,
  maxCostPerResult,
  conversionValue,
}: StrategyProps) {
  const bench = getBenchmark(objective, segment, coverage);
  const frequency =
    campaign.impressions > 0 && campaign.reach > 0 ? campaign.impressions / campaign.reach : 0;

  const targetRoas = maxCostPerResult ?? 0; // maxCostPerResult = ROAS mínimo desejado
  const avgValue = conversionValue ?? 0;
  const clicks = campaign.clicks;
  const spend = campaign.spend;

  // Estimated ROAS: (conversions * avgValue) / spend — simplified with clicks as proxy
  const estimatedConversions = clicks > 0 ? Math.round(clicks * (campaign.ctr / 100) * 0.1) : 0; // rough proxy
  const estimatedRevenue = estimatedConversions * avgValue;
  const currentRoas = spend > 0 && avgValue > 0 ? estimatedRevenue / spend : 0;
  const roasOk = targetRoas > 0 && currentRoas >= targetRoas;

  return (
    <Card className="border-amber-100 bg-gradient-to-br from-amber-50/40 to-orange-50/20 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-amber-600" />
          ROAS Mínimo — Indicadores
        </CardTitle>
        <p className="text-[10px] text-amber-700/60">
          Foco em retorno: a Meta otimiza para atingir o ROAS mínimo definido, priorizando
          conversões de maior valor.
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        <MetricRow
          label="CPC"
          value={campaign.cpc}
          formatted={fmtBrl(campaign.cpc)}
          metric="cpc"
          benchmark={bench}
        />
        <MetricRow
          label="CPM"
          value={campaign.cpm}
          formatted={fmtBrl(campaign.cpm)}
          metric="cpm"
          benchmark={bench}
        />
        <MetricRow
          label="CTR"
          value={campaign.ctr}
          formatted={`${fmt(campaign.ctr)}%`}
          metric="ctr"
          benchmark={bench}
        />
        <MetricRow
          label="Frequência"
          value={frequency}
          formatted={`${fmt(frequency, 1)}x`}
          metric="frequency"
          benchmark={bench}
        />

        {targetRoas > 0 && (
          <div
            className={`mt-2 p-3 rounded-xl border ${roasOk ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
          >
            <p className="text-xs font-semibold">
              ROAS Meta: {fmt(targetRoas, 1)}x
              {avgValue > 0 && <> | Valor/conversão: {fmtBrl(avgValue)}</>}
            </p>
            {avgValue > 0 && spend > 0 && (
              <p className="text-[10px] text-slate-600 mt-0.5">
                ROAS estimado:{" "}
                <strong className={roasOk ? "text-emerald-600" : "text-amber-600"}>
                  {fmt(currentRoas, 1)}x
                </strong>
                {roasOk
                  ? " — acima da meta"
                  : " — abaixo da meta, otimize criativos ou aumente o valor médio"}
              </p>
            )}
          </div>
        )}

        {avgValue === 0 && (
          <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-500">
              Configure o <strong>Valor Médio por Conversão</strong> em Configurações para ver o
              ROAS estimado.
            </p>
          </div>
        )}

        <div className="pt-2 text-[10px] text-slate-500 space-y-1 border-t border-amber-100">
          <p>
            <strong>Dica:</strong> Com ROAS Mínimo, a Meta pode reduzir a entrega para manter o
            retorno. Se o volume cair, considere diminuir a meta de ROAS em 0.5x e monitore.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Selector: renders the right panel based on bidStrategy ───

export function StrategyPanel(props: StrategyProps & { bidStrategy: string | null }) {
  const { bidStrategy, ...rest } = props;

  switch (bidStrategy) {
    case "LOWEST_COST":
      return <LowestCostIndicators {...rest} />;
    case "COST_CAP":
      return <CostCapIndicators {...rest} />;
    case "BID_CAP":
      return <BidCapIndicators {...rest} />;
    case "ROAS_MIN":
      return <RoasMinIndicators {...rest} />;
    default:
      return <LowestCostIndicators {...rest} />;
  }
}
