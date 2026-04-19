"use client";

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
  good: { color: "text-emerald-600", bg: "bg-emerald-50", position: 85 },
  average: { color: "text-amber-600", bg: "bg-amber-50", position: 50 },
  bad: { color: "text-red-500", bg: "bg-red-50", position: 15 },
};

export function Thermometer({ label, value, status, tip, reference }: Props) {
  const cfg = STATUS_CONFIG[status];
  const statusLabel = getStatusLabel(status);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-semibold ${cfg.color}`}>{statusLabel}</span>
      </div>

      <p className="text-lg font-bold leading-none">{value}</p>

      {/* Gradient bar with indicator */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-red-300 via-amber-300 to-emerald-400 overflow-visible">
        <div
          className="absolute top-[-2px] w-3 h-3 rounded-full bg-white border-2 shadow-sm transition-all"
          style={{
            left: `calc(${cfg.position}% - 6px)`,
            borderColor:
              status === "good" ? "#10b981" : status === "average" ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>

      {reference && <p className="text-[10px] text-slate-400">{reference}</p>}

      {/* Always-visible contextual text */}
      {tip && (
        <p
          className={`text-[10px] leading-relaxed ${status === "bad" ? "text-red-600 font-medium" : "text-slate-500"}`}
        >
          {tip}
        </p>
      )}
    </div>
  );
}
