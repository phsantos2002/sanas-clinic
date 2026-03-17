"use client";

import { useState, useTransition } from "react";
import { Play, Pause, Image as ImageIcon, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateAdStatus, type MetaAd } from "@/app/actions/meta";
import { fmt, fmtBrl, getCreativeHealth, healthConfig } from "./shared";

type Props = {
  ad: MetaAd;
};

export function AdCard({ ad }: Props) {
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
      if (result.success) { setStatus(newStatus); toast.success(`Anúncio ${newStatus === "ACTIVE" ? "ativado" : "pausado"}`); }
      else toast.error(result.error);
    });
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
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${hCfg.color}`}>
                <HealthIcon className="h-3 w-3" />
                {hCfg.label}
              </span>
              {ad.impressions > 0 && (
                <span className="text-[10px] text-slate-400">Freq: {fmt(ad.frequency, 1)}x</span>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={isPending} className="h-7 text-[10px] rounded-lg gap-1 bg-white/80">
          {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {isActive ? "Pausar" : "Ativar"}
        </Button>
      </div>

      {/* Mini KPIs for ad */}
      {ad.impressions > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Gasto", value: fmtBrl(ad.spend) },
            { label: "CTR", value: `${fmt(ad.ctr)}%` },
            { label: "CPC", value: fmtBrl(ad.cpc) },
            { label: "CPM", value: fmtBrl(ad.cpm) },
          ].map((k) => (
            <div key={k.label} className="bg-white/60 rounded-lg px-2 py-1">
              <p className="text-[9px] text-slate-400">{k.label}</p>
              <p className="text-[11px] font-bold text-slate-800">{k.value}</p>
            </div>
          ))}
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
