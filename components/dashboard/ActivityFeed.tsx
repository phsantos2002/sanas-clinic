"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, ArrowRight, MessageCircle, PenTool, Zap, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { getActivityFeed } from "@/app/actions/dashboard";

type FeedItem = {
  id: string;
  type: "new_lead" | "stage_change" | "message" | "post_published" | "workflow_run" | "alert" | "score_update";
  text: string;
  entityName: string;
  entityUrl?: string;
  createdAt: string;
};

const TYPE_CONFIG = {
  new_lead: { icon: Users, color: "text-emerald-500 bg-emerald-50" },
  stage_change: { icon: ArrowRight, color: "text-blue-500 bg-blue-50" },
  message: { icon: MessageCircle, color: "text-indigo-500 bg-indigo-50" },
  post_published: { icon: PenTool, color: "text-violet-500 bg-violet-50" },
  workflow_run: { icon: Zap, color: "text-amber-500 bg-amber-50" },
  alert: { icon: AlertTriangle, color: "text-red-500 bg-red-50" },
  score_update: { icon: TrendingUp, color: "text-teal-500 bg-teal-50" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `ha ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `ha ${Math.floor(diff / 3600)}h`;
  return `ha ${Math.floor(diff / 86400)}d`;
}

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    const data = await getActivityFeed(20);
    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 60000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="h-7 w-7 bg-slate-100 rounded-lg" />
            <div className="h-3 w-48 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4">
      <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-400" /> Atividade Recente
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">Nenhuma atividade recente</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.new_lead;
            const Icon = cfg.icon;
            return (
              <div key={item.id} className="flex items-start gap-2.5 py-1.5">
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.text}{" "}
                    {item.entityUrl ? (
                      <Link href={item.entityUrl} className="font-medium text-indigo-600 hover:text-indigo-800">
                        {item.entityName}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-800">{item.entityName}</span>
                    )}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{timeAgo(item.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
