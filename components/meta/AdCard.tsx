"use client";

import { useState, useTransition } from "react";
import { Play, Pause, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateAdStatus, type MetaAd } from "@/app/actions/meta";
import { fmt, fmtBrl, getCreativeHealth, healthConfig } from "./shared";
import { classifyMetric, METRIC_COLORS, type BenchmarkMetrics } from "@/lib/benchmarks";

type Props = {
  ad: MetaAd;
  benchmark?: BenchmarkMetrics | null;
};

export function AdCard({ ad, benchmark }: Props) {
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
      if (result.success) {
        setStatus(newStatus);
        toast.success(`Anúncio ${newStatus === "ACTIVE" ? "ativado" : "pausado"}`);
      } else toast.error(result.error);
    });
  }

  function metricColor(metric: "ctr" | "cpm" | "cpc", value: number): string {
    if (!benchmark || value === 0) return "text-slate-800";
    return METRIC_COLORS[classifyMetric(metric, value, benchmark)];
  }

  function metricDot(metric: "ctr" | "cpm" | "cpc", value: number): string | null {
    if (!benchmark || value === 0) return null;
    const status = classifyMetric(metric, value, benchmark);
    return status === "good"
      ? "bg-emerald-500"
      : status === "average"
        ? "bg-amber-400"
        : "bg-red-500";
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
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${hCfg.color}`}
              >
                <HealthIcon className="h-3 w-3" />
                {hCfg.label}
              </span>
              {ad.impressions > 0 && (
                <span className="text-[10px] text-slate-400">Freq: {fmt(ad.frequency, 1)}x</span>
              )}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleToggle}
          disabled={isPending}
          className="h-7 text-[10px] rounded-lg gap-1 bg-white/80"
        >
          {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isActive ? "Pausar" : "Ativar"}
        </Button>
      </div>

      {/* Mini KPIs for ad with benchmark coloring */}
      {ad.impressions > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/60 rounded-lg px-2 py-1">
            <p className="text-[9px] text-slate-400">Gasto</p>
            <p className="text-[11px] font-bold text-slate-800">{fmtBrl(ad.spend)}</p>
          </div>
          <div className="bg-white/60 rounded-lg px-2 py-1">
            <p className="text-[9px] text-slate-400">CTR</p>
            <p
              className={`text-[11px] font-bold flex items-center gap-1 ${metricColor("ctr", ad.ctr)}`}
            >
              {metricDot("ctr", ad.ctr) && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${metricDot("ctr", ad.ctr)}`}
                />
              )}
              {fmt(ad.ctr)}%
            </p>
          </div>
          <div className="bg-white/60 rounded-lg px-2 py-1">
            <p className="text-[9px] text-slate-400">CPC</p>
            <p
              className={`text-[11px] font-bold flex items-center gap-1 ${metricColor("cpc", ad.cpc)}`}
            >
              {metricDot("cpc", ad.cpc) && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${metricDot("cpc", ad.cpc)}`}
                />
              )}
              {fmtBrl(ad.cpc)}
            </p>
          </div>
          <div className="bg-white/60 rounded-lg px-2 py-1">
            <p className="text-[9px] text-slate-400">CPM</p>
            <p
              className={`text-[11px] font-bold flex items-center gap-1 ${metricColor("cpm", ad.cpm)}`}
            >
              {metricDot("cpm", ad.cpm) && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${metricDot("cpm", ad.cpm)}`}
                />
              )}
              {fmtBrl(ad.cpm)}
            </p>
          </div>
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
