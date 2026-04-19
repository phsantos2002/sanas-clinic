"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getDailyBrief } from "@/app/actions/dashboard";

type BriefData = {
  text: string;
  actions: { label: string; href: string }[];
  generatedAt: string;
};

export function DailyBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBrief = async (force = false) => {
    setLoading(true);
    const data = await getDailyBrief(force);
    setBrief(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 bg-indigo-200 rounded" />
          <div className="h-4 w-32 bg-indigo-200 rounded" />
        </div>
        <div className="h-4 w-3/4 bg-indigo-100 rounded mb-2" />
        <div className="h-4 w-1/2 bg-indigo-100 rounded" />
      </div>
    );
  }

  if (!brief) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-indigo-900">Resumo do Dia</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-indigo-400">{brief.generatedAt}</span>
          <button
            onClick={() => fetchBrief(true)}
            className="p-1 text-indigo-400 hover:text-indigo-600 rounded transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-line">{brief.text}</p>
      {brief.actions.length > 0 && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {brief.actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-colors"
            >
              {action.label} <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
