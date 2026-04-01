"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { getChecklistProgress } from "@/app/actions/onboarding";

type CheckItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
};

export function SetupChecklist() {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("lux-checklist-dismissed");
    if (wasDismissed) { setDismissed(true); setLoading(false); return; }

    getChecklistProgress().then((data) => {
      setItems(data || []);
      setLoading(false);
    });
  }, []);

  if (loading || dismissed) return null;

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;

  // Don't show if no items loaded (auth issue) or all completed
  if (total === 0 || (completed === total && total > 0)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">Primeiros Passos</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
              {completed}/{total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); localStorage.setItem("lux-checklist-dismissed", "true"); }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {collapsed ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(completed / total) * 100}%` }} />
        </div>

        {/* Items */}
        {!collapsed && (
          <div className="p-3 space-y-1 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                  item.completed ? "opacity-60" : "hover:bg-slate-50"
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-xs font-medium ${item.completed ? "text-slate-400 line-through" : "text-slate-700"}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
