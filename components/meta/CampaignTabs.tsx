"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import type { MetaCampaignFull } from "./shared";
import type { CampaignConfig } from "@/types";

type Props = {
  campaigns: MetaCampaignFull[];
  configs: Record<string, CampaignConfig>;
  activeCampaignId: string | null;
  onSelect: (campaignId: string) => void;
};

const OBJECTIVE_ICONS: Record<string, string> = {
  MESSAGES: "💬",
  CONVERSIONS: "🛒",
  LEADS: "📋",
  ENGAGEMENT: "📸",
  TRAFFIC: "🌐",
  SALES: "🛒",
  AWARENESS: "📢",
};

export function CampaignTabs({ campaigns, configs, activeCampaignId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function check() {
      if (!el) return;
      setShowScrollHint(
        el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 10
      );
    }
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [campaigns.length]);

  if (campaigns.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {campaigns.map((c) => {
          const isSelected = c.id === activeCampaignId;
          const isActive = c.status === "ACTIVE";
          const cfg = configs[c.id];
          const hasConfig = !!cfg;
          const objectiveIcon = hasConfig ? (OBJECTIVE_ICONS[cfg.campaignObjective] ?? "⚙") : "⚙";

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
              {/* Objective icon */}
              <span className="text-sm leading-none">{objectiveIcon}</span>

              {/* Status dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  isActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />

              <span className="truncate max-w-[120px]">{c.name}</span>

              {/* No config indicator */}
              {!hasConfig && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                  title="Sem configuração"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Scroll hint (Correção 9) */}
      {showScrollHint && (
        <div className="absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-white via-white/80 to-transparent flex items-center justify-end pointer-events-none">
          <ChevronRight className="h-4 w-4 text-slate-400 mr-0.5" />
        </div>
      )}
    </div>
  );
}
