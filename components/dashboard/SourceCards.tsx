"use client";

import type { LeadSourceStats } from "@/types";

type Props = {
  stats: LeadSourceStats;
  activeFilter: string | null;
  onFilter: (source: string | null) => void;
};

const cards = [
  { key: null, label: "Total", icon: "💬", color: "bg-white" },
  { key: "meta", label: "Meta Ads", icon: "∞", color: "bg-white" },
  { key: "google", label: "Google Ads", icon: "▲", color: "bg-white" },
  { key: "whatsapp", label: "WhatsApp", icon: "📱", color: "bg-white" },
  { key: "manual", label: "Manual", icon: "✏️", color: "bg-white" },
  { key: "unknown", label: "Não Rastreada", icon: "❓", color: "bg-white" },
] as const;

function getCount(stats: LeadSourceStats, key: string | null): number {
  if (key === null) return stats.total;
  return stats[key as keyof Omit<LeadSourceStats, "total">] ?? 0;
}

export function SourceCards({ stats, activeFilter, onFilter }: Props) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {cards.map((card) => {
        const count = getCount(stats, card.key);
        const isActive = activeFilter === card.key;
        return (
          <button
            key={card.key ?? "total"}
            onClick={() => onFilter(isActive ? null : card.key)}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
              isActive
                ? "border-black bg-slate-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="text-lg">{card.icon}</span>
            <span className="text-xl font-bold text-slate-900">{count}</span>
            <span className="text-[10px] text-slate-500 leading-tight">{card.label}</span>
          </button>
        );
      })}
    </div>
  );
}
