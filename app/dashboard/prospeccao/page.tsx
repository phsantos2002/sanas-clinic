import Link from "next/link";
import { Upload, Users, Repeat, Activity } from "lucide-react";
import { getImportBatches } from "@/app/actions/prospeccao";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";

export default async function ProspeccaoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [batches, outboundCount, sqlCount] = await Promise.all([
    getImportBatches(5),
    prisma.lead.count({ where: { userId: user.id, leadType: "outbound" } }),
    prisma.lead.count({
      where: { userId: user.id, leadType: "outbound", tags: { has: "sql" } },
    }),
  ]);

  const conversionPct = outboundCount > 0 ? Math.round((sqlCount / outboundCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prospecção Outbound</h1>
        <p className="text-sm text-slate-500 mt-1">
          Importe leads frios, crie cadências multi-toque e acompanhe a performance dos SDRs.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Leads outbound</p>
          <p className="text-2xl font-bold text-slate-900">{outboundCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">SQL (qualificados)</p>
          <p className="text-2xl font-bold text-slate-900">{sqlCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Taxa de qualificação</p>
          <p className="text-2xl font-bold text-indigo-600">{conversionPct}%</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/dashboard/prospeccao/import"
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100">
              <Upload className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">Importar Leads (CSV)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Suba uma lista fria para prospecção</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/prospeccao/cadencias"
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-violet-50 rounded-xl flex items-center justify-center group-hover:bg-violet-100">
              <Repeat className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">Cadências</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sequências multi-toque (WhatsApp + email)
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/chat/team"
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">Time (SDRs / Closers)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Gerencie papéis e metas diárias</p>
            </div>
          </div>
        </Link>

        <Link
          href="/dashboard/prospeccao/performance"
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 text-sm">Performance</h3>
              <p className="text-xs text-slate-500 mt-0.5">Atividades, metas e funil outbound</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent batches */}
      {batches.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Últimas importações</h3>
          <div className="space-y-2">
            {batches.map((b) => (
              <div
                key={b.batchId}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {b.totalLeads} lead{b.totalLeads !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {b.sampleNames.slice(0, 3).join(", ")}
                    {b.sampleNames.length > 0 && b.totalLeads > 3 && " ..."}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-3">
                  {new Date(b.firstImportedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
