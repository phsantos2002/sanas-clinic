import Link from "next/link";
import { Award, TrendingUp } from "lucide-react";
import type { SDRMetrics } from "@/app/actions/sdrDashboard";

const ROLE_LABELS: Record<string, string> = {
  sdr: "SDR",
  sdr_manager: "Ger. SDR",
  closer: "Closer",
  closer_manager: "Ger. Closer",
  attendant: "Atend.",
  admin: "Admin",
};

export function TeamPerformanceMini({ metrics }: { metrics: SDRMetrics }) {
  const topAttendants = [...metrics.attendants]
    .sort((a, b) => b.todayActivity - a.todayActivity)
    .slice(0, 6);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
          <Award className="h-4 w-4 text-amber-600" /> Performance do time
        </h3>
        <Link
          href="/dashboard/settings/team"
          className="text-[11px] text-indigo-600 hover:underline"
        >
          Ver tudo →
        </Link>
      </div>

      {/* Totais hoje */}
      <div className="grid grid-cols-3 gap-3 pb-4 mb-4 border-b border-slate-50">
        <MiniStat label="Mensagens" value={metrics.today.messagesSent} />
        <MiniStat label="Emails" value={metrics.today.emailsSent} />
        <MiniStat label="SQLs passados" value={metrics.today.sqlsHandedOff} accent />
      </div>

      {/* Ranking */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2 min-h-[160px]">
        {topAttendants.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <TrendingUp className="h-8 w-8 text-slate-200 mb-2" />
            <p className="text-xs text-slate-400 max-w-[220px]">Nenhum membro cadastrado.</p>
            <Link
              href="/dashboard/settings/team"
              className="text-[11px] text-indigo-600 hover:underline mt-2"
            >
              Cadastrar equipe
            </Link>
          </div>
        ) : (
          topAttendants.map((a) => {
            const pct =
              a.dailyActivityGoal > 0
                ? Math.min(100, Math.round((a.todayActivity / a.dailyActivityGoal) * 100))
                : 0;
            const barColor =
              pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-300";

            return (
              <div key={a.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 flex items-center gap-1.5">
                    <span className="font-medium text-slate-700 truncate">{a.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {ROLE_LABELS[a.role] || a.role}
                    </span>
                  </div>
                  <span className="text-slate-500 tabular-nums shrink-0 ml-2">
                    {a.todayActivity}/{a.dailyActivityGoal}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p
        className={`text-xl font-bold leading-none ${
          accent ? "text-indigo-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">{label}</p>
    </div>
  );
}
