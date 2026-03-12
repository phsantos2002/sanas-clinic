"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Props = {
  tracked: number;
  untracked: number;
  total: number;
  trackedPercent: number;
  untrackedPercent: number;
};

export function DonutChart({ tracked, untracked, total, trackedPercent, untrackedPercent }: Props) {
  const data = [
    { name: "Rastreadas", value: tracked },
    { name: "Não rastreadas", value: untracked },
  ];

  const COLORS = ["#3b82f6", "#fb923c"];

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-sm text-zinc-400">
        Sem dados
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="relative w-[160px] h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-2xl font-bold">{total}</p>
        </div>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-zinc-600">{trackedPercent}% Rastreadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-zinc-600">{untrackedPercent}% Não rastreadas</span>
        </div>
      </div>
    </div>
  );
}
