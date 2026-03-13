"use client";

import { useState, useTransition } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { getDashboardStats, type DashboardStats } from "@/app/actions/leads";
import { OriginBarChart } from "@/components/dashboard/OriginBarChart";
import { DonutChart } from "@/components/dashboard/DonutChart";

type Props = {
  initialStats: DashboardStats;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const SOURCE_OPTIONS = [
  { value: "all", label: "Todas as Origens" },
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "other", label: "Outras Origens" },
  { value: "unknown", label: "Não Rastreada" },
];

export function DashboardOverviewClient({ initialStats }: Props) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isPending, startTransition] = useTransition();

  function applyDateFilter(start: string, end: string) {
    setStartDate(start);
    setEndDate(end);
    startTransition(async () => {
      const newStats = await getDashboardStats(start, end);
      setStats(newStats);
    });
  }

  function handleExportReport() {
    const headers = ["Data", "Meta Ads", "Google Ads", "Outras Origens", "Não Rastreada", "Total"];
    const rows = stats.daily.map((d) => [
      d.date,
      d.meta.toString(),
      d.google.toString(),
      d.other.toString(),
      d.unknown.toString(),
      (d.meta + d.google + d.other + d.unknown).toString(),
    ]);

    rows.push([
      "TOTAL",
      stats.bySource.meta.toString(),
      stats.bySource.google.toString(),
      (stats.bySource.whatsapp + stats.bySource.manual).toString(),
      stats.bySource.unknown.toString(),
      stats.total.toString(),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${startDate}-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredDaily = stats.daily.map((d) => {
    if (sourceFilter === "all") return d;
    return {
      ...d,
      meta: sourceFilter === "meta" ? d.meta : 0,
      google: sourceFilter === "google" ? d.google : 0,
      other: sourceFilter === "other" ? d.other : 0,
      unknown: sourceFilter === "unknown" ? d.unknown : 0,
    };
  });

  const sourceCards = [
    { key: "meta", label: "Meta Ads", count: stats.bySource.meta, color: "bg-blue-500" },
    { key: "google", label: "Google Ads", count: stats.bySource.google, color: "bg-yellow-500" },
    { key: "other", label: "Outras Origens", count: stats.bySource.whatsapp + stats.bySource.manual, color: "bg-slate-400" },
    { key: "unknown", label: "Não Rastreada", count: stats.bySource.unknown, color: "bg-orange-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Início → Dashboard</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={applyDateFilter}
          />

          <div className="flex items-center gap-2">
            <CustomSelect
              options={SOURCE_OPTIONS}
              value={sourceFilter}
              onChange={setSourceFilter}
              className="flex-1 sm:flex-none sm:w-[180px]"
            />

            <Button
              onClick={handleExportReport}
              className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 text-xs sm:text-sm gap-1.5 rounded-xl flex-shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Baixar Relatório</span>
              <span className="sm:hidden">Baixar</span>
            </Button>
          </div>
        </div>
      </div>

      {isPending && (
        <div className="text-xs text-slate-400 text-center">Carregando...</div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visão Geral das Conversas */}
        <Card className="lg:col-span-1 border-slate-100 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Visão Geral das Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total de Conversas Novas Ativas</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-4 h-4 bg-emerald-100 rounded flex items-center justify-center">
                    <span className="text-emerald-600 text-[10px]">✓</span>
                  </div>
                  <span className="text-xs text-slate-500">Conversas Rastreadas</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{stats.tracked}</p>
                <p className="text-xs text-slate-400">{stats.trackedPercent}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-4 h-4 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-600 text-[10px]">✗</span>
                  </div>
                  <span className="text-xs text-slate-500">Conversas não rastreadas</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{stats.untracked}</p>
                <p className="text-xs text-slate-400">{stats.untrackedPercent}%</p>
              </div>
            </div>

            <DonutChart
              tracked={stats.tracked}
              untracked={stats.untracked}
              total={stats.total}
              trackedPercent={stats.trackedPercent}
              untrackedPercent={stats.untrackedPercent}
            />
          </CardContent>
        </Card>

        {/* Origem das Conversas */}
        <Card className="lg:col-span-2 border-slate-100 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Origem das Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
              {sourceCards.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSourceFilter(sourceFilter === s.key ? "all" : s.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                    sourceFilter === s.key
                      ? "border-indigo-300 bg-indigo-50/50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <div className="text-left">
                    <p className="text-lg font-bold leading-tight text-slate-900">{s.count}</p>
                    <p className="text-[10px] text-slate-400">{s.label}</p>
                  </div>
                </button>
              ))}
            </div>

            <OriginBarChart data={filteredDaily} startDate={startDate} endDate={endDate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
