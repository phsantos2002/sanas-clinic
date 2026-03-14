"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DailyOriginStats } from "@/app/actions/leads";

type Props = {
  data: DailyOriginStats[];
  startDate?: string;
  endDate?: string;
};

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function fillDays(data: DailyOriginStats[], startDate?: string, endDate?: string): DailyOriginStats[] {
  if (data.length === 0 && !startDate) return data;

  const dataMap = new Map<string, DailyOriginStats>();
  for (const d of data) dataMap.set(d.date, d);

  const start = startDate ? new Date(startDate + "T12:00:00") : new Date(data[0].date + "T12:00:00");
  const end = endDate ? new Date(endDate + "T12:00:00") : new Date(data[data.length - 1].date + "T12:00:00");

  const result: DailyOriginStats[] = [];
  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    result.push(dataMap.get(key) ?? { date: key, meta: 0, google: 0, other: 0, unknown: 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export function OriginBarChart({ data, startDate, endDate }: Props) {
  const filledData = fillDays(data, startDate, endDate);

  if (filledData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-sm text-slate-400">
        Nenhum dado no período selecionado
      </div>
    );
  }

  const chartData = filledData.map((d) => ({
    date: formatDateLabel(d.date),
    "Meta Ads": d.meta,
    "Outras Origens": d.google + d.other,
    "Não rastreada": d.unknown,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={Math.max(0, Math.floor(chartData.length / 10))}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Bar dataKey="Meta Ads" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
        <Bar dataKey="Outras Origens" stackId="a" fill="#a1a1aa" />
        <Bar dataKey="Não rastreada" stackId="a" fill="#fb923c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
