"use client";

import { SourceIcon, ChatBubbleIcon, sourceConfig } from "@/components/icons/SourceIcons";
import type { LeadSourceStats } from "@/types";

type Props = {
  stats: LeadSourceStats;
  activeFilter: string | null;
  onFilter: (source: string | null) => void;
};

const cards = [
  { key: null, label: "Total" },
  { key: "meta" },
  { key: "google" },
  { key: "whatsapp" },
  { key: "manual" },
  { key: "unknown" },
] as const;

function getCount(stats: LeadSourceStats, key: string | null): number {
  if (key === null) return stats.total;
  return stats[key as keyof Omit<LeadSourceStats, "total">] ?? 0;
}

export function SourceCards({ stats, activeFilter, onFilter }: Props) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {cards.map((card) => {
        const count = getCount(stats, card.key);
        const isActive = activeFilter === card.key;
        const config = card.key ? sourceConfig[card.key] : null;

        return (
          <button
            key={card.key ?? "total"}
            onClick={() => onFilter(isActive ? null : card.key)}
            className={`
              relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-2xl border-2 transition-all duration-200
              ${isActive
                ? `${config?.bg ?? "bg-indigo-50"} ${config?.border ?? "border-indigo-200"} shadow-md scale-[1.02]`
                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
              }
            `}
          >
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0
              ${config?.bg ?? "bg-indigo-50"}
            `}>
              {card.key ? (
                <SourceIcon source={card.key} size={22} />
              ) : (
                <ChatBubbleIcon size={22} />
              )}
            </div>

            <div className="text-left min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-none">{count}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {config?.label ?? "Total"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
