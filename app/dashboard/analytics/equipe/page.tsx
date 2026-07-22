import { redirect } from "next/navigation";
import { Bot, Inbox, Ticket as TicketIcon, Trophy } from "lucide-react";
import { getTeamReport } from "@/app/actions/attendantReports";

export const dynamic = "force-dynamic";

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)}min`;
  const h = min / 60;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default async function EquipeAnalyticsPage(props: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const periodDays = Math.min(Math.max(parseInt(searchParams.periodo ?? "30") || 30, 1), 365);

  const report = await getTeamReport(periodDays);
  if (!report) redirect("/dashboard/chat"); // vendedor não acessa relatórios de gestão

  const cards = [
    {
      icon: TicketIcon,
      label: "Atendimentos no período",
      value: report.totals.ticketsCreated,
      color: "text-indigo-600 bg-indigo-50",
    },
    {
      icon: Bot,
      label: "Resolvidos só pela IA",
      value: report.totals.resolvedByBot,
      color: "text-violet-600 bg-violet-50",
    },
    {
      icon: Inbox,
      label: "Na fila agora",
      value: report.totals.pendingNow,
      color: "text-amber-600 bg-amber-50",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Desempenho da equipe</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Últimos {report.periodDays} dias — TME (espera até 1ª resposta) e TMA (duração do
            atendimento)
          </p>
        </div>
        <div className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`/dashboard/analytics/equipe?periodo=${d}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                report.periodDays === d
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-slate-100 rounded-2xl p-4">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${c.color}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{c.value}</p>
            <p className="text-xs text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Atendente</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Aceitos</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Resolvidos</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Abertos agora</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Msgs enviadas</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">TME</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">TMA</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Conversões</th>
              </tr>
            </thead>
            <tbody>
              {report.attendants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Nenhum atendente ativo. Crie vendedores em Config &gt; Usuários.
                  </td>
                </tr>
              ) : (
                report.attendants.map((a, i) => (
                  <tr key={a.attendantId} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {i === 0 && a.ticketsResolved > 0 && (
                          <Trophy className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{a.name}</p>
                          <p className="text-[10px] text-slate-400">{a.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.ticketsAccepted}</td>
                    <td className="px-4 py-3 text-slate-700">{a.ticketsResolved}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          a.ticketsOpenNow > 0
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-400"
                        }`}
                      >
                        {a.ticketsOpenNow}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.messagesSent}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtDuration(a.tmeSeconds)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtDuration(a.tmaSeconds)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${
                          a.conversions > 0 ? "text-green-600" : "text-slate-400"
                        }`}
                      >
                        {a.conversions}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-slate-400">
        TME: média entre o lead pedir atendimento humano e a primeira resposta. TMA: média entre
        aceitar e resolver. Conversões: leads do atendente que chegaram na etapa Cliente no
        período.
      </p>
    </div>
  );
}
