"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/app/actions/calendarEvents";
import type { AttendantData } from "@/app/actions/whatsappHub";

const HOUR_HEIGHT = 60; // px por hora
const START_HOUR = 8;
const END_HOUR = 19;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

const ATTENDANT_COLORS = [
  "bg-emerald-100 border-emerald-300 text-emerald-900",
  "bg-blue-100 border-blue-300 text-blue-900",
  "bg-violet-100 border-violet-300 text-violet-900",
  "bg-amber-100 border-amber-300 text-amber-900",
  "bg-rose-100 border-rose-300 text-rose-900",
  "bg-cyan-100 border-cyan-300 text-cyan-900",
  "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-900",
];

const UNASSIGNED_COL = "__unassigned__";

type Props = {
  date: string;
  attendants: AttendantData[];
  events: CalendarEvent[];
  onCellClick: (attendantId: string | null, hour: number, minute: number) => void;
  onEventClick: (event: CalendarEvent) => void;
};

export function CalendarGrid({ date, attendants, events, onCellClick, onEventClick }: Props) {
  const activeAttendants = useMemo(() => attendants.filter((a) => a.isActive), [attendants]);

  // Agrupa eventos por coluna (attendantId ou UNASSIGNED)
  const eventsByColumn = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const col = ev.attendantId ?? UNASSIGNED_COL;
      if (!map.has(col)) map.set(col, []);
      map.get(col)!.push(ev);
    }
    return map;
  }, [events]);

  const hasUnassigned = (eventsByColumn.get(UNASSIGNED_COL)?.length ?? 0) > 0;

  // Colunas: unassigned (se houver) + atendentes ativos
  const columns = useMemo(() => {
    const cols: { id: string; name: string; role?: string; isUnassigned?: boolean }[] = [];
    if (hasUnassigned) {
      cols.push({ id: UNASSIGNED_COL, name: "Sem responsável", isUnassigned: true });
    }
    for (const a of activeAttendants) {
      cols.push({ id: a.id, name: a.name, role: a.role });
    }
    return cols;
  }, [activeAttendants, hasUnassigned]);

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400">
        Nenhum atendente ativo. Cadastre em Configurações → Usuários.
      </div>
    );
  }

  const totalHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;

  return (
    <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Coluna fixa com horários */}
      <div className="flex-shrink-0 w-14 border-r border-slate-200 bg-slate-50">
        <div className="h-14 border-b border-slate-200" />
        <div className="relative" style={{ height: totalHeight }}>
          {HOURS.map((h, idx) => (
            <div
              key={h}
              className="absolute left-0 right-0 text-[10px] text-slate-400 px-2"
              style={{ top: idx * HOUR_HEIGHT - 6 }}
            >
              {h}h
            </div>
          ))}
        </div>
      </div>

      {/* Colunas dos atendentes (scroll horizontal no mobile) */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex" style={{ minWidth: columns.length * 160 }}>
          {columns.map((col, colIdx) => {
            const colEvents = eventsByColumn.get(col.id) ?? [];
            const colorClass = col.isUnassigned
              ? "bg-slate-100 border-slate-300 text-slate-700"
              : ATTENDANT_COLORS[colIdx % ATTENDANT_COLORS.length];

            return (
              <div
                key={col.id}
                className="flex-1 min-w-[160px] border-r border-slate-200 last:border-r-0"
              >
                {/* Header do atendente */}
                <div className="h-14 border-b border-slate-200 px-3 py-2 flex flex-col justify-center bg-white">
                  <div className="text-sm font-semibold text-slate-900 truncate">{col.name}</div>
                  {col.role && !col.isUnassigned && (
                    <div className="text-[10px] text-slate-400 truncate uppercase">{col.role}</div>
                  )}
                </div>

                {/* Grade de slots */}
                <div className="relative" style={{ height: totalHeight }}>
                  {/* Linhas de hora */}
                  {HOURS.map((h, idx) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: idx * HOUR_HEIGHT }}
                    >
                      {/* Sub-divisão de 30min (linha pontilhada) */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-slate-100"
                        style={{ top: HOUR_HEIGHT / 2 }}
                      />
                      {/* Click handlers — divide a hora em 2 (00 e 30) */}
                      <button
                        type="button"
                        onClick={() => onCellClick(col.isUnassigned ? null : col.id, h, 0)}
                        className="absolute left-0 right-0 hover:bg-slate-50/60"
                        style={{ top: 0, height: HOUR_HEIGHT / 2 }}
                        aria-label={`Agendar às ${h}:00`}
                      />
                      <button
                        type="button"
                        onClick={() => onCellClick(col.isUnassigned ? null : col.id, h, 30)}
                        className="absolute left-0 right-0 hover:bg-slate-50/60"
                        style={{ top: HOUR_HEIGHT / 2, height: HOUR_HEIGHT / 2 }}
                        aria-label={`Agendar às ${h}:30`}
                      />
                    </div>
                  ))}

                  {/* Eventos posicionados absolutamente */}
                  {colEvents.map((ev) => {
                    const pos = computePosition(ev, date);
                    if (!pos) return null;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onEventClick(ev)}
                        className={`absolute left-1 right-1 rounded-md border px-2 py-1 text-left text-[11px] leading-tight overflow-hidden hover:opacity-90 transition-opacity ${colorClass}`}
                        style={{ top: pos.top, height: pos.height, minHeight: 28 }}
                      >
                        <div className="font-semibold truncate">
                          {pos.startLabel} – {pos.endLabel}
                        </div>
                        <div className="truncate">{ev.summary}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function computePosition(ev: CalendarEvent, dateStr: string) {
  if (!ev.start || !ev.end) return null;
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const dayStart = new Date(`${dateStr}T${String(START_HOUR).padStart(2, "0")}:00:00`);
  const minutesFromStart = (start.getTime() - dayStart.getTime()) / 60000;
  const durationMin = (end.getTime() - start.getTime()) / 60000;
  if (minutesFromStart < 0) return null; // evento começa antes do START_HOUR
  const top = (minutesFromStart / 60) * HOUR_HEIGHT;
  const height = (durationMin / 60) * HOUR_HEIGHT;
  return {
    top,
    height,
    startLabel: start.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    endLabel: end.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
