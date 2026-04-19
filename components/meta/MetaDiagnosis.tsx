"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Pause } from "lucide-react";
import Link from "next/link";
import { getMetaDiagnosis } from "@/app/actions/meta";

type Diagnosis = {
  insight: string;
  severity: "info" | "warning" | "critical";
  actions: { label: string; href: string }[];
  generatedAt: string;
};

export function MetaDiagnosis() {
  const [data, setData] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async (force = false) => {
    setLoading(true);
    const d = await getMetaDiagnosis(force);
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    fetch_();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-48 bg-blue-200 rounded mb-2" />
        <div className="h-4 w-3/4 bg-blue-100 rounded" />
      </div>
    );
  }

  if (!data) return null;

  const severityStyles = {
    info: {
      bg: "from-blue-50 to-indigo-50",
      border: "border-blue-100",
      icon: TrendingUp,
      iconColor: "text-blue-500",
    },
    warning: {
      bg: "from-amber-50 to-orange-50",
      border: "border-amber-100",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    critical: {
      bg: "from-red-50 to-rose-50",
      border: "border-red-100",
      icon: Pause,
      iconColor: "text-red-500",
    },
  };

  const style = severityStyles[data.severity];
  const Icon = style.icon;

  return (
    <div className={`bg-gradient-to-r ${style.bg} border ${style.border} rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${style.iconColor}`} />
          <h3 className="text-sm font-semibold text-slate-800">Diagnostico IA</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{data.generatedAt}</span>
          <button
            onClick={() => fetch_(true)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{data.insight}</p>
      {data.actions.length > 0 && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {data.actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
