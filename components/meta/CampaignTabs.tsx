"use client";

import type { MetaCampaignFull } from "./shared";
import type { CampaignConfig } from "@/types";

type Props = {
  campaigns: MetaCampaignFull[];
  configs: Record<string, CampaignConfig>;
  activeCampaignId: string | null;
  onSelect: (campaignId: string) => void;
};

export function CampaignTabs({ campaigns, configs, activeCampaignId, onSelect }: Props) {
  if (campaigns.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {campaigns.map((c) => {
        const isSelected = c.id === activeCampaignId;
        const isActive = c.status === "ACTIVE";
        const hasConfig = !!configs[c.id];

        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              isSelected
                ? "bg-white border border-indigo-200 text-indigo-700 shadow-sm"
                : "bg-slate-50 border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {/* Status dot */}
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isActive ? "bg-emerald-500" : "bg-slate-300"
            }`} />

            <span className="truncate max-w-[140px]">{c.name}</span>

            {/* Config indicator */}
            {!hasConfig && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Sem configuração" />
            )}
          </button>
        );
      })}
    </div>
  );
}
