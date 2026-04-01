"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { getAnalyticsNarrative } from "@/app/actions/advancedAnalytics";

export function AnalyticsNarrative() {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState("");

  const fetch_ = async (force = false) => {
    setLoading(true);
    const data = await getAnalyticsNarrative(force);
    setNarrative(data?.text || null);
    setTimestamp(data?.generatedAt || "");
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-48 bg-violet-200 rounded mb-2" />
        <div className="h-4 w-full bg-violet-100 rounded mb-1" />
        <div className="h-4 w-3/4 bg-violet-100 rounded" />
      </div>
    );
  }

  if (!narrative) return null;

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <h3 className="text-sm font-semibold text-violet-900">Resumo por IA</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-violet-400">{timestamp}</span>
          <button onClick={() => fetch_(true)} className="p-1 text-violet-400 hover:text-violet-600 rounded">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-violet-800 leading-relaxed whitespace-pre-line">{narrative}</p>
    </div>
  );
}
