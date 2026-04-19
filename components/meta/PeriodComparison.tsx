"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";

type MetricComparison = {
  label: string;
  current: number;
  previous: number;
  format: "currency" | "number" | "percent";
};

type Props = {
  metrics: MetricComparison[];
};

function formatValue(value: number, format: string): string {
  if (format === "currency") return `R$ ${value.toFixed(2)}`;
  if (format === "percent") return `${value.toFixed(2)}%`;
  return value.toLocaleString("pt-BR");
}

function getDelta(
  current: number,
  previous: number
): { pct: number; direction: "up" | "down" | "same" } {
  if (previous === 0) return { pct: 0, direction: "same" };
  const pct = ((current - previous) / previous) * 100;
  return { pct: Math.abs(pct), direction: pct > 1 ? "up" : pct < -1 ? "down" : "same" };
}

export function PeriodComparison({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const delta = getDelta(m.current, m.previous);
        // For cost metrics, down is good. For performance metrics, up is good.
        const costMetrics = ["CPL", "CPC", "CPM", "Gasto"];
        const isGood = costMetrics.some((c) => m.label.includes(c))
          ? delta.direction === "down"
          : delta.direction === "up";

        return (
          <div key={m.label} className="bg-white border border-slate-100 rounded-xl p-3">
            <p className="text-[11px] text-slate-400 mb-1">{m.label}</p>
            <p className="text-lg font-bold text-slate-900">{formatValue(m.current, m.format)}</p>
            <div
              className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                delta.direction === "same"
                  ? "text-slate-400"
                  : isGood
                    ? "text-emerald-600"
                    : "text-red-500"
              }`}
            >
              {delta.direction === "up" && <ArrowUp className="h-3 w-3" />}
              {delta.direction === "down" && <ArrowDown className="h-3 w-3" />}
              {delta.direction === "same" && <Minus className="h-3 w-3" />}
              {delta.pct > 0 ? `${delta.pct.toFixed(1)}%` : "sem mudanca"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
