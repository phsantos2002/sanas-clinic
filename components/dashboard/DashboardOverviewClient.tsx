"use client";

import { useState, useTransition } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, type DashboardStats } from "@/app/actions/leads";
import { OriginBarChart } from "@/components/dashboard/OriginBarChart";
import { DonutChart } from "@/components/dashboard/DonutChart";

type Props = {
  initialStats: DashboardStats;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

    // Summary row
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

  // Filter daily data by source for chart
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
    { key: "meta", label: "Meta Ads", count: stats.bySource.meta, color: "bg-blue-500", icon: "∞" },
    { key: "google", label: "Google Ads", count: stats.bySource.google, color: "bg-yellow-500", icon: "▲" },
    { key: "other", label: "Outras Origens", count: stats.bySource.whatsapp + stats.bySource.manual, color: "bg-slate-400", icon: "⊕" },
    { key: "unknown", label: "Não Rastreada", count: stats.bySource.unknown, color: "bg-orange-400", icon: "∅" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">Início → Dashboard</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => applyDateFilter(e.target.value, endDate)}
              className="text-xs border-none outline-none bg-transparent"
            />
            <span className="text-xs text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => applyDateFilter(startDate, e.target.value)}
              className="text-xs border-none outline-none bg-transparent"
            />
          </div>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-700 outline-none"
          >
            <option value="all">Todas as Origens</option>
            <option value="meta">Meta Ads</option>
            <option value="google">Google Ads</option>
            <option value="other">Outras Origens</option>
            <option value="unknown">Não Rastreada</option>
          </select>

          {/* Export */}
          <Button
            onClick={handleExportReport}
            className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar Relatório
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="text-xs text-slate-400 text-center">Carregando...</div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visão Geral das Conversas */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Visão Geral das Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total de Conversas Novas Ativas</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
            </div>

            {/* Tracked / Untracked */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-4 h-4 bg-emerald-100 rounded flex items-center justify-center">
                    <span className="text-emerald-600 text-[10px]">✓</span>
                  </div>
                  <span className="text-xs text-slate-500">Conversas Rastreadas</span>
                </div>
                <p className="text-lg font-bold">{stats.tracked}</p>
                <p className="text-xs text-slate-400">{stats.trackedPercent}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-4 h-4 bg-red-100 rounded flex items-center justify-center">
                    <span className="text-red-600 text-[10px]">✗</span>
                  </div>
                  <span className="text-xs text-slate-500">Conversas não rastreadas</span>
                </div>
                <p className="text-lg font-bold">{stats.untracked}</p>
                <p className="text-xs text-slate-400">{stats.untrackedPercent}%</p>
              </div>
            </div>

            {/* Donut chart */}
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Origem das Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Source summary cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {sourceCards.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSourceFilter(sourceFilter === s.key ? "all" : s.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    sourceFilter === s.key
                      ? "border-slate-800 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <div className="text-left">
                    <p className="text-lg font-bold leading-tight">{s.count}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Bar chart */}
            <OriginBarChart data={filteredDaily} startDate={startDate} endDate={endDate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
