"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getSetupProgress } from "@/app/actions/onboarding";

type SetupItem = {
  id: string;
  label: string;
  completed: boolean;
  weight: number;
  href: string;
};

export function SetupProgress() {
  const [items, setItems] = useState<SetupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSetupProgress().then((data) => {
      setItems(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />;
  }

  const totalWeight = items.reduce((acc, i) => acc + i.weight, 0);
  const completedWeight = items.filter((i) => i.completed).reduce((acc, i) => acc + i.weight, 0);
  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  if (percentage === 100) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800">Configuracao do Perfil</h3>
        <span
          className={`text-sm font-bold ${
            percentage >= 70
              ? "text-emerald-600"
              : percentage >= 40
                ? "text-amber-600"
                : "text-red-600"
          }`}
        >
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full mb-4">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 70 ? "bg-emerald-500" : percentage >= 40 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Items */}
      <div className="space-y-1.5">
        {items
          .filter((i) => !i.completed)
          .slice(0, 3)
          .map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors group"
            >
              <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="flex-1">{item.label}</span>
              <ArrowRight className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        {items
          .filter((i) => i.completed)
          .slice(0, 2)
          .map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="line-through">{item.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
