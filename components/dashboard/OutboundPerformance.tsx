import {
  Users,
  MessageCircle,
  Mail,
  Target,
  TrendingUp,
  Activity,
  Award,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { getSDRMetrics } from "@/app/actions/sdrDashboard";

const ROLE_LABELS: Record<string, string> = {
  sdr: "SDR",
  sdr_manager: "Gerente SDR",
  closer: "Closer",
  closer_manager: "Gerente Closer",
  attendant: "Atendente",
  admin: "Admin",
};

export async function OutboundPerformance() {
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
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Performance Outbound</h2>
        <p className="text-sm text-slate-500 mt-1">
          Atividades do time de prospecção, cadências ativas e funil outbound.
        </p>
      </div>

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
            <Link href="/dashboard/pipeline" className="text-indigo-600 hover:underline">
              importe uma lista pelo pipeline
            </Link>
            .
          </p>
        )}
      </div>

      {metrics.attendants.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4">Atividade por pessoa (hoje)</h3>
          <div className="space-y-2">
            {metrics.attendants
              .sort((a, b) => b.todayActivity - a.todayActivity)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-1 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {ROLE_LABELS[a.role] || a.role} · {a.activeLeads} leads
                    </p>
                  </div>
                  <span className="text-xs text-slate-600 font-semibold tabular-nums">
                    {a.todayActivity} ações
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
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
