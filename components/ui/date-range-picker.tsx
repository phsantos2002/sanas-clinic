"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  onChange: (start: string, end: string) => void;
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DateRangePicker({ startDate, endDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const ref = useRef<HTMLDivElement>(null);

  const startParts = startDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState(startParts[0]);
  const [viewMonth, setViewMonth] = useState(startParts[1] - 1);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  function handleDayClick(day: number) {
    const dateStr = toStr(viewYear, viewMonth, day);
    if (selecting === "start") {
      if (dateStr > endDate) {
        onChange(dateStr, dateStr);
      } else {
        onChange(dateStr, endDate);
      }
      setSelecting("end");
    } else {
      if (dateStr < startDate) {
        onChange(dateStr, startDate);
      } else {
        onChange(startDate, dateStr);
      }
      setSelecting("start");
      setOpen(false);
    }
  }

  function handlePreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onChange(
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    );
    setOpen(false);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  function isDayInRange(day: number) {
    const d = toStr(viewYear, viewMonth, day);
    return d >= startDate && d <= endDate;
  }
  function isDayStart(day: number) {
    return toStr(viewYear, viewMonth, day) === startDate;
  }
  function isDayEnd(day: number) {
    return toStr(viewYear, viewMonth, day) === endDate;
  }
  function isToday(day: number) {
    return toStr(viewYear, viewMonth, day) === new Date().toISOString().slice(0, 10);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 hover:border-slate-300 transition-colors outline-none focus:ring-2 focus:ring-indigo-500/20 w-full sm:w-auto justify-center sm:justify-start"
      >
        <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
        <span>{formatDisplay(startDate)}</span>
        <span className="text-slate-300">—</span>
        <span>{formatDisplay(endDate)}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-4 w-[calc(100vw-2rem)] sm:w-[320px] max-w-[320px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick presets */}
          <div className="flex gap-1.5 mb-3">
            {[
              { label: "7d", days: 7 },
              { label: "15d", days: 15 },
              { label: "30d", days: 30 },
              { label: "90d", days: 90 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => handlePreset(p.days)}
                className="flex-1 text-xs py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors font-medium"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const inRange = isDayInRange(day);
              const isStart = isDayStart(day);
              const isEnd = isDayEnd(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`relative h-8 w-full text-xs rounded-lg transition-all font-medium
                    ${isStart || isEnd
                      ? "bg-indigo-500 text-white shadow-sm"
                      : inRange
                        ? "bg-indigo-50 text-indigo-700"
                        : today
                          ? "bg-slate-100 text-slate-900 font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Selection hint */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              {selecting === "start" ? "Selecione a data inicial" : "Selecione a data final"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
