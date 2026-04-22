import { getAttendants } from "@/app/actions/whatsappHub";
import { getCadences } from "@/app/actions/cadences";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";
import { CNPJProspector } from "@/components/prospeccao/CNPJProspector";

export default async function ProspeccaoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [attendants, stages, cadences, outboundCount, sqlCount, cnpjCount] = await Promise.all([
    getAttendants(),
    prisma.stage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true, eventName: true },
    }),
    getCadences().catch(() => []),
    prisma.lead.count({ where: { userId: user.id, leadType: "outbound" } }),
    prisma.lead.count({
      where: { userId: user.id, leadType: "outbound", tags: { has: "sql" } },
    }),
    prisma.lead.count({ where: { userId: user.id, source: "cnpj" } }),
  ]);

  const conversionPct = outboundCount > 0 ? Math.round((sqlCount / outboundCount) * 100) : 0;
  const hasStages = stages.length > 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Prospecção</h1>
        <p className="text-sm text-slate-500 mt-1">
          Encontre empresas brasileiras por atividade e envie direto para uma coluna do pipeline.
          Dados oficiais da Receita Federal.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Leads outbound (total)</p>
          <p className="text-2xl font-bold text-slate-900">{outboundCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Via CNPJ/Receita</p>
          <p className="text-2xl font-bold text-slate-900">{cnpjCount}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-1">Taxa de qualificação</p>
          <p className="text-2xl font-bold text-indigo-600">{conversionPct}%</p>
        </div>
      </div>

      {!hasStages ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          Você precisa ter pelo menos uma coluna no pipeline antes de prospectar.{" "}
          <a href="/dashboard/settings/pipeline" className="underline font-medium">
            Criar colunas
          </a>
          .
        </div>
      ) : (
        <CNPJProspector
          stages={stages}
          attendants={attendants.map((a) => ({ id: a.id, name: a.name, role: a.role }))}
          cadences={cadences.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive }))}
        />
      )}

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-500">
        <p className="font-medium text-slate-700 mb-1">Onde foram os outros blocos?</p>
        <ul className="space-y-0.5">
          <li>
            • <strong>Importar leads (CSV)</strong> — agora dentro de cada coluna do{" "}
            <a href="/dashboard/pipeline" className="text-indigo-600 hover:underline">
              Pipeline
            </a>{" "}
            (ícone de upload no cabeçalho da coluna).
          </li>
          <li>
            • <strong>Cadências</strong> — movidas para{" "}
            <a href="/dashboard/settings/tools" className="text-indigo-600 hover:underline">
              Config &gt; Ferramentas
            </a>
            .
          </li>
          <li>
            • <strong>Time (SDRs / Closers)</strong> — movido para{" "}
            <a href="/dashboard/settings/team" className="text-indigo-600 hover:underline">
              Config &gt; Time
            </a>
            .
          </li>
          <li>
            • <strong>Performance</strong> — agora é uma seção em{" "}
            <a href="/dashboard/analytics" className="text-indigo-600 hover:underline">
              Analytics
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
