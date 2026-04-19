"use client";

import { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { getHealthScore } from "@/app/actions/dashboard";

type HealthData = {
  score: number;
  breakdown: { label: string; value: number; weight: number }[];
  weakest: string;
};

export function HealthScore() {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    getHealthScore().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-36 bg-slate-200 rounded mb-3" />
        <div className="h-20 w-20 bg-slate-100 rounded-full mx-auto" />
      </div>
    );
  }

  const color =
    data.score >= 70 ? "text-emerald-600" : data.score >= 40 ? "text-amber-600" : "text-red-600";
  const bgColor =
    data.score >= 70
      ? "stroke-emerald-500"
      : data.score >= 40
        ? "stroke-amber-500"
        : "stroke-red-500";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (data.score / 100) * circumference;

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4">
      <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-slate-400" /> Saude do Negocio
      </h3>

      <div className="flex items-center justify-center mb-3">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              className={bgColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${color}`}>{data.score}</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {data.breakdown.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{item.label}</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    item.value >= 70
                      ? "bg-emerald-500"
                      : item.value >= 40
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
              <span className="text-slate-600 font-medium w-7 text-right">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {data.weakest && (
        <p className="text-[10px] text-slate-400 mt-2 text-center">Ponto fraco: {data.weakest}</p>
      )}
    </div>
  );
}
