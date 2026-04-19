import Link from "next/link";
import {
  ChevronLeft,
  Users,
  MessageCircle,
  Mail,
  Target,
  TrendingUp,
  Activity,
  Award,
  Calendar,
} from "lucide-react";
import { getSDRMetrics } from "@/app/actions/sdrDashboard";

const ROLE_LABELS: Record<string, string> = {
  sdr: "SDR",
  sdr_manager: "Gerente SDR",
  closer: "Closer",
  closer_manager: "Gerente Closer",
  attendant: "Atendente",
  admin: "Admin",
};

export default async function PerformancePage() {
  const metrics = await getSDRMetrics();

  const conversionRate =
    metrics.funnel.outboundLeads > 0
      ? Math.round((metrics.funnel.sqlOutbound / metrics.funnel.outboundLeads) * 100)
      : 0;

  const contactedRate =
    metrics.funnel.outboundLeads > 0
      ? Math.round((metrics.funnel.contactedOutbound / metrics.funnel.outboundLeads) * 100)
      : 0;

  const meetingRate =
    metrics.funnel.sqlOutbound > 0
      ? Math.round((metrics.funnel.meetingsBooked / metrics.funnel.sqlOutbound) * 100)
      : 0;

  const openRate =
    metrics.today.emailsSent > 0
      ? Math.round((metrics.today.emailsOpened / metrics.today.emailsSent) * 100)
      : 0;

  return (
    <div className="space-y-5 max-w-6xl">
      <Link
        href="/dashboard/prospeccao"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" /> Prospecção
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Performance da Equipe</h1>
        <p className="text-sm text-slate-500 mt-1">
          Atividades de hoje, cadências ativas e funil outbound.
        </p>
      </div>

      {/* Team composition */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          icon={Users}
          label="Equipe ativa"
          value={metrics.totalAttendants.all}
          color="indigo"
        />
        <KpiCard icon={Target} label="SDRs" value={metrics.totalAttendants.sdr} color="violet" />
        <KpiCard
          icon={Award}
          label="Closers"
          value={metrics.totalAttendants.closer}
          color="green"
        />
        <KpiCard
          icon={Activity}
          label="Cadências ativas"
          value={metrics.cadences.active}
          color="amber"
        />
      </div>

      {/* Today */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-slate-400" /> Atividades de hoje
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric
            label="Mensagens enviadas"
            value={metrics.today.messagesSent}
            icon={MessageCircle}
            iconColor="text-green-600"
          />
          <Metric
            label="Emails enviados"
            value={metrics.today.emailsSent}
            icon={Mail}
            iconColor="text-blue-600"
            sub={openRate > 0 ? `${openRate}% aberto` : undefined}
          />
          <Metric
            label="SQLs passados"
            value={metrics.today.sqlsHandedOff}
            icon={TrendingUp}
            iconColor="text-violet-600"
          />
          <Metric
            label="Inscritos em cadência"
            value={metrics.cadences.enrolled}
            icon={Activity}
            iconColor="text-amber-600"
          />
        </div>
      </div>

      {/* Funnel outbound */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-slate-400" /> Funil Outbound
        </h3>
        <FunnelBar
          label="Leads outbound importados"
          value={metrics.funnel.outboundLeads}
          pct={100}
          color="bg-slate-400"
        />
        <FunnelBar
          label="Contatados (1º toque)"
          value={metrics.funnel.contactedOutbound}
          pct={contactedRate}
          color="bg-blue-500"
        />
        <FunnelBar
          label="Qualificados (SQL)"
          value={metrics.funnel.sqlOutbound}
          pct={conversionRate}
          color="bg-indigo-500"
        />
        <FunnelBar
          label="Reuniões agendadas"
          value={metrics.funnel.meetingsBooked}
          pct={meetingRate}
          color="bg-green-500"
        />
        {metrics.funnel.outboundLeads === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">
            Nenhum lead outbound ainda —{" "}
            <Link href="/dashboard/prospeccao/import" className="text-indigo-600 hover:underline">
              importe uma lista
            </Link>
            .
          </p>
        )}
      </div>

      {/* Per-attendant */}
      {metrics.attendants.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Atividade por pessoa (hoje)</h3>
          <div className="space-y-2">
            {metrics.attendants
              .sort((a, b) => b.todayActivity - a.todayActivity)
              .map((a) => {
                const pct =
                  a.dailyActivityGoal > 0
                    ? Math.min(100, Math.round((a.todayActivity / a.dailyActivityGoal) * 100))
                    : 0;
                const barColor =
                  pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-300";
                return (
                  <div key={a.id} className="grid grid-cols-[1fr,auto,auto] gap-3 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {ROLE_LABELS[a.role] || a.role} · {a.activeLeads} leads
                      </p>
                    </div>
                    <div className="w-40 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold tabular-nums w-16 text-right">
                      {a.todayActivity}/{a.dailyActivityGoal}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: "indigo" | "violet" | "green" | "amber" | "blue";
}) {
  const bg: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    violet: "bg-violet-50 text-violet-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${bg[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  iconColor,
  sub,
}: {
  label: string;
  value: number;
  icon: typeof MessageCircle;
  iconColor: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${iconColor} shrink-0`} />
      <div>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-[11px] text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function FunnelBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs text-slate-900 font-semibold tabular-nums">
          {value} <span className="text-slate-400">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}
