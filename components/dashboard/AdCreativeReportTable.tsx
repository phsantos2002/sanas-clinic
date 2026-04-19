"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Pause,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdCreativeRow, CreativeHealthStatus } from "@/app/actions/analytics";

type Props = {
  creatives: AdCreativeRow[];
};

const healthConfig: Record<
  CreativeHealthStatus,
  {
    label: string;
    color: string;
    bg: string;
    icon: typeof TrendingUp;
    tip: string;
  }
> = {
  performing: {
    label: "Performando",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: TrendingUp,
    tip: "Bom desempenho",
  },
  saturating: {
    label: "Saturando",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Activity,
    tip: "Prepare substituto",
  },
  declining: {
    label: "Declinando",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: TrendingDown,
    tip: "Considere pausar",
  },
  paused: {
    label: "Pausado",
    color: "text-slate-500",
    bg: "bg-slate-50 border-slate-200",
    icon: Pause,
    tip: "Inativo",
  },
  new: {
    label: "Novo",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: Sparkles,
    tip: "Aguarde dados",
  },
};

function fmt(n: number, dec = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtBrl(n: number) {
  return `R$ ${fmt(n)}`;
}

type SortKey = "spend" | "ctr" | "cpm" | "cpc" | "frequency" | "impressions";

export function AdCreativeReportTable({ creatives }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterHealth, setFilterHealth] = useState<CreativeHealthStatus | "all">("all");

  if (creatives.length === 0) {
    return null;
  }

  const filtered =
    filterHealth === "all" ? creatives : creatives.filter((c) => c.health === filterHealth);

  const sorted = [...filtered].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortDesc ? -diff : diff;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDesc ? (
      <ChevronDown className="h-3 w-3 inline ml-0.5" />
    ) : (
      <ChevronUp className="h-3 w-3 inline ml-0.5" />
    );
  };

  // Summary stats
  const activeCreatives = creatives.filter((c) => c.health === "performing").length;
  const saturatingCreatives = creatives.filter((c) => c.health === "saturating").length;
  const decliningCreatives = creatives.filter((c) => c.health === "declining").length;

  const healthFilters: Array<{ key: CreativeHealthStatus | "all"; label: string; count: number }> =
    [
      { key: "all", label: "Todos", count: creatives.length },
      { key: "performing", label: "Performando", count: activeCreatives },
      { key: "saturating", label: "Saturando", count: saturatingCreatives },
      { key: "declining", label: "Declinando", count: decliningCreatives },
    ];

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Image className="h-4 w-4 text-violet-500" />
            Relatório de Criativos
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {healthFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterHealth(f.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                  filterHealth === f.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left font-medium text-slate-400 px-6 py-2.5">Criativo</th>
                <th className="text-left font-medium text-slate-400 px-3 py-2.5">Saúde</th>
                <th
                  className="text-right font-medium text-slate-400 px-3 py-2.5 cursor-pointer hover:text-slate-600"
                  onClick={() => handleSort("spend")}
                >
                  Gasto <SortIcon col="spend" />
                </th>
                <th
                  className="text-right font-medium text-slate-400 px-3 py-2.5 cursor-pointer hover:text-slate-600"
                  onClick={() => handleSort("impressions")}
                >
                  Impressões <SortIcon col="impressions" />
                </th>
                <th
                  className="text-right font-medium text-slate-400 px-3 py-2.5 cursor-pointer hover:text-slate-600"
                  onClick={() => handleSort("ctr")}
                >
                  CTR <SortIcon col="ctr" />
                </th>
                <th
                  className="text-right font-medium text-slate-400 px-3 py-2.5 cursor-pointer hover:text-slate-600"
                  onClick={() => handleSort("cpm")}
                >
                  CPM <SortIcon col="cpm" />
                </th>
                <th
                  className="text-right font-medium text-slate-400 px-3 py-2.5 cursor-pointer hover:text-slate-600"
                  onClick={() => handleSort("cpc")}
                >
                  CPC <SortIcon col="cpc" />
                </th>
                <th
                  className="text-right font-medium text-slate-400 px-3 py-2.5 cursor-pointer hover:text-slate-600"
                  onClick={() => handleSort("frequency")}
                >
                  Freq <SortIcon col="frequency" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ad) => {
                const hCfg = healthConfig[ad.health];
                const HIcon = hCfg.icon;
                return (
                  <tr
                    key={ad.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {ad.thumbnailUrl ? (
                          <img
                            src={ad.thumbnailUrl}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Image className="h-4 w-4 text-slate-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800 line-clamp-1">{ad.name}</p>
                          <p className="text-[10px] text-slate-400">{ad.adSetName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${hCfg.bg} ${hCfg.color}`}
                        title={hCfg.tip}
                      >
                        <HIcon className="h-3 w-3" />
                        {hCfg.label}
                      </span>
                    </td>
                    <td className="text-right px-3 py-3 font-medium text-slate-800">
                      {fmtBrl(ad.spend)}
                    </td>
                    <td className="text-right px-3 py-3 text-slate-600">
                      {ad.impressions.toLocaleString("pt-BR")}
                    </td>
                    <td
                      className={`text-right px-3 py-3 font-medium ${
                        ad.ctr >= 1.5
                          ? "text-emerald-600"
                          : ad.ctr >= 0.5
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}
                    >
                      {fmt(ad.ctr)}%
                    </td>
                    <td
                      className={`text-right px-3 py-3 font-medium ${
                        ad.cpm <= 20
                          ? "text-emerald-600"
                          : ad.cpm <= 50
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}
                    >
                      {fmtBrl(ad.cpm)}
                    </td>
                    <td
                      className={`text-right px-3 py-3 font-medium ${
                        ad.cpc <= 2
                          ? "text-emerald-600"
                          : ad.cpc <= 5
                            ? "text-amber-600"
                            : "text-red-500"
                      }`}
                    >
                      {fmtBrl(ad.cpc)}
                    </td>
                    <td
                      className={`text-right px-3 py-3 font-medium ${
                        ad.frequency >= 4
                          ? "text-red-500"
                          : ad.frequency >= 2.5
                            ? "text-amber-600"
                            : "text-slate-600"
                      }`}
                    >
                      {fmt(ad.frequency, 1)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">
            Nenhum criativo encontrado com esse filtro.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
