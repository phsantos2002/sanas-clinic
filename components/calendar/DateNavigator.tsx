"use client";

import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";

type Props = {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
};

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function DateNavigator({ date, onChange }: Props) {
  const d = new Date(date + "T12:00:00");
  const day = d.getDate();
  const monthLabel = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const weekday = WEEKDAYS[d.getDay()];
  const isToday = date === todayString();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(shiftDate(date, -1))}
        className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Dia anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center px-3 min-w-[140px]">
        <div className="text-sm font-bold text-slate-900">
          {day} {monthLabel} {year}
        </div>
        <div className="text-xs text-slate-400">{weekday}</div>
      </div>

      <button
        onClick={() => onChange(shiftDate(date, 1))}
        className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Próximo dia"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {!isToday && (
        <button
          onClick={() => onChange(todayString())}
          className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
        >
          <CalIcon className="h-3.5 w-3.5" />
          Hoje
        </button>
      )}

      {/* Native date picker fallback */}
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="ml-1 h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white"
      />
    </div>
  );
}
