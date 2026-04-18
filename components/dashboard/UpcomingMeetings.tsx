import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import type { UpcomingMeeting } from "@/app/actions/overview";

export function UpcomingMeetings({ meetings }: { meetings: UpcomingMeeting[] }) {
  const today = meetings.filter((m) => m.dayBucket === "today");
  const tomorrow = meetings.filter((m) => m.dayBucket === "tomorrow");

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-indigo-600" /> Reuniões
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            Hoje <strong className="text-slate-900">{today.length}</strong>
          </span>
          <span className="text-slate-500">
            Amanhã <strong className="text-slate-900">{tomorrow.length}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5 min-h-[280px]">
        {meetings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <CalendarDays className="h-8 w-8 text-slate-200 mb-2" />
            <p className="text-xs text-slate-400 max-w-[220px]">
              Nenhuma reunião agendada para hoje ou amanhã.
            </p>
            <Link
              href="/dashboard/settings/integrations"
              className="text-[11px] text-indigo-600 hover:underline mt-2"
            >
              Conectar Google Calendar
            </Link>
          </div>
        ) : (
          meetings.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-slate-50"
            >
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  m.dayBucket === "today"
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {m.summary}
                </p>
                <p className="text-[11px] text-slate-400">
                  {m.whenLabel}
                  {m.durationMin > 0 && ` · ${m.durationMin}min`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
