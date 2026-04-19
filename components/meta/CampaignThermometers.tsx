"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer } from "./Thermometer";
import { fmt, fmtBrl, type MetaCampaignFull } from "./shared";
import { getBenchmark, getMetricStatus, type BenchmarkMetrics } from "@/lib/benchmarks";
import { getThermometerText } from "@/lib/thermometerTexts";
import type { CampaignConfig } from "@/types";

type Props = {
  campaign: MetaCampaignFull;
  config: CampaignConfig | null;
};

export function CampaignThermometers({ campaign, config }: Props) {
  const benchmark = getBenchmark(
    config?.campaignObjective,
    config?.businessSegment,
    null // coverage from global pixel config is handled in parent
  );
  const objective = config?.campaignObjective ?? null;
  const bidStrategy = config?.bidStrategy ?? "LOWEST_COST";
  const frequency =
    campaign.impressions > 0 && campaign.reach > 0 ? campaign.impressions / campaign.reach : 0;

  const ctrStatus = getMetricStatus("ctr", campaign.ctr, benchmark);
  const cpmStatus = getMetricStatus("cpm", campaign.cpm, benchmark);
  const cpcStatus = getMetricStatus("cpc", campaign.cpc, benchmark);
  const freqStatus = getMetricStatus("frequency", frequency, benchmark);

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900">
          Termômetros de Performance
        </CardTitle>
        {config && (
          <p className="text-[10px] text-slate-400">
            Benchmarks ajustados para: {config.campaignObjective}
            {config.businessSegment ? ` × ${config.businessSegment}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Core metrics — always shown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Thermometer
            label="CTR"
            value={`${fmt(campaign.ctr)}%`}
            status={ctrStatus}
            tip={getThermometerText("ctr", ctrStatus, objective, bidStrategy)}
            reference={`Ref: >${fmt(benchmark.ctr.good)}%`}
          />
          <Thermometer
            label="CPM"
            value={fmtBrl(campaign.cpm)}
            status={cpmStatus}
            tip={getThermometerText("cpm", cpmStatus, objective, bidStrategy)}
            reference={`Ref: <R$ ${fmt(benchmark.cpm.good)}`}
          />
          <Thermometer
            label="CPC"
            value={fmtBrl(campaign.cpc)}
            status={cpcStatus}
            tip={getThermometerText("cpc", cpcStatus, objective, bidStrategy)}
            reference={`Ref: <R$ ${fmt(benchmark.cpc.good)}`}
          />
          <Thermometer
            label="Frequência"
            value={`${fmt(frequency, 1)}x`}
            status={freqStatus}
            tip={getThermometerText("frequency", freqStatus, objective, bidStrategy)}
            reference={`Ref: <${fmt(benchmark.frequency.good, 1)}x`}
          />
        </div>

        {/* Strategy-specific indicators */}
        <StrategyIndicator
          bidStrategy={bidStrategy}
          campaign={campaign}
          config={config}
          benchmark={benchmark}
        />
      </CardContent>
    </Card>
  );
}

// ─── Strategy-specific indicator strip ───

function StrategyIndicator({
  bidStrategy,
  campaign,
  config,
  benchmark,
}: {
  bidStrategy: string;
  campaign: MetaCampaignFull;
  config: CampaignConfig | null;
  benchmark: BenchmarkMetrics;
}) {
  const maxCost = config?.maxCostPerResult;
  const bidValue = config?.bidValue;
  const conversionValue = config?.conversionValue;

  switch (bidStrategy) {
    case "COST_CAP": {
      if (!maxCost || maxCost <= 0)
        return (
          <Hint
            text="Configure o Custo Máximo por Resultado para ver indicadores de Cost Cap."
            color="blue"
          />
        );
      const overCap = campaign.cpc > maxCost;
      return (
        <div
          className={`p-3 rounded-xl border text-xs ${overCap ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}
        >
          <p className="font-semibold">
            Cost Cap: {fmtBrl(maxCost)} | CPC real: {fmtBrl(campaign.cpc)}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {overCap
              ? "CPC acima do cap — a Meta pode reduzir a entrega. Aumente o cap em 10-20% ou otimize criativos."
              : "CPC dentro do cap — boa eficiência. Considere reduzir gradualmente para encontrar o equilíbrio."}
          </p>
        </div>
      );
    }

    case "BID_CAP": {
      const cpc = campaign.cpc;
      if (cpc <= 0) return null;
      const sugMin = Math.max(0.01, cpc * 0.8);
      const sugMax = cpc * 1.5;
      const sugIdeal = cpc * 1.1;
      return (
        <div className="bg-white rounded-xl p-3 border border-violet-200 space-y-2">
          <p className="text-[10px] font-semibold text-violet-900">Faixa recomendada de Bid</p>
          <div className="h-2.5 rounded-full bg-gradient-to-r from-red-200 via-emerald-300 to-amber-200 relative">
            <div
              className="absolute top-[-2px] w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm"
              style={{ left: "calc(50% - 7px)" }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-red-600">{fmtBrl(sugMin)}</span>
            <span className="text-emerald-600">{fmtBrl(sugIdeal)}</span>
            <span className="text-amber-600">{fmtBrl(sugMax)}</span>
          </div>
          {bidValue && bidValue > 0 && (
            <p className="text-[10px] text-slate-600">
              Seu lance: <strong>{fmtBrl(bidValue)}</strong>
              {bidValue < sugMin
                ? " — muito baixo, risco de entrega limitada"
                : bidValue > sugMax
                  ? " — acima do recomendado"
                  : " — dentro da faixa ideal"}
            </p>
          )}
        </div>
      );
    }

    case "ROAS_MIN": {
      const targetRoas = maxCost ?? 0;
      const avgValue = conversionValue ?? 0;
      const spend = campaign.spend;
      const clicks = campaign.clicks;
      const estConv = clicks > 0 ? Math.round(clicks * (campaign.ctr / 100) * 0.1) : 0;
      const estRevenue = estConv * avgValue;
      const currentRoas = spend > 0 && avgValue > 0 ? estRevenue / spend : 0;
      const roasOk = targetRoas > 0 && currentRoas >= targetRoas;

      if (targetRoas <= 0 && avgValue <= 0)
        return (
          <Hint
            text="Configure o ROAS Mínimo e o Valor por Conversão para ver indicadores de ROAS."
            color="amber"
          />
        );

      return (
        <div
          className={`p-3 rounded-xl border text-xs ${roasOk ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
        >
          <p className="font-semibold">
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
      );
    }

    default: // LOWEST_COST
      return (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
          <p className="font-semibold text-emerald-900">Menor Custo — Otimização automática</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            Monitore CPM e frequência. Se o CPM subir, expanda o público. Se a frequência passar de{" "}
            {fmt(benchmark.frequency.average, 1)}x, renove criativos.
          </p>
        </div>
      );
  }
}

function Hint({ text, color }: { text: string; color: "blue" | "amber" }) {
  const cls =
    color === "blue"
      ? "bg-blue-50 border-blue-200 text-blue-700"
      : "bg-amber-50 border-amber-200 text-amber-700";
  return <div className={`p-2 rounded-xl border text-[10px] ${cls}`}>{text}</div>;
}
