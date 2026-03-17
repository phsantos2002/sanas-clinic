"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { MetricStatus } from "@/lib/benchmarks";
import { getStatusLabel } from "@/lib/thermometerTexts";

type Props = {
  label: string;
  value: string;
  status: MetricStatus;
  tip?: string;
  reference?: string;
};

const STATUS_CONFIG: Record<MetricStatus, { color: string; bg: string; position: number }> = {
  good:    { color: "text-emerald-600", bg: "bg-emerald-50", position: 85 },
  average: { color: "text-amber-600",   bg: "bg-amber-50",   position: 50 },
  bad:     { color: "text-red-500",     bg: "bg-red-50",     position: 15 },
};

export function Thermometer({ label, value, status, tip, reference }: Props) {
  const [showTip, setShowTip] = useState(false);
  const cfg = STATUS_CONFIG[status];
  const statusLabel = getStatusLabel(status);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${cfg.color}`}>{statusLabel}</span>
          {tip && (
            <button
              type="button"
              onClick={() => setShowTip(!showTip)}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <p className="text-lg font-bold leading-none">{value}</p>

      {/* Gradient bar with indicator */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-red-300 via-amber-300 to-emerald-400 overflow-visible">
        <div
          className="absolute top-[-2px] w-3 h-3 rounded-full bg-white border-2 shadow-sm transition-all"
          style={{
            left: `calc(${cfg.position}% - 6px)`,
            borderColor: status === "good" ? "#10b981" : status === "average" ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>

      {reference && (
        <p className="text-[10px] text-slate-400">{reference}</p>
      )}

      {showTip && tip && (
        <div className={`text-[10px] leading-relaxed p-2 rounded-lg ${cfg.bg}`}>
          {tip}
        </div>
      )}
    </div>
  );
}
