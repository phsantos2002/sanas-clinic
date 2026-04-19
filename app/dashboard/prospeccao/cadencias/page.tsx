import Link from "next/link";
import { ChevronLeft, Plus, Repeat, Clock, MessageCircle, Mail } from "lucide-react";
import { getCadences } from "@/app/actions/cadences";

export default async function CadenciasPage() {
  const cadences = await getCadences();

  return (
    <div className="space-y-5 max-w-5xl">
      <Link
        href="/dashboard/prospeccao"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" /> Prospecção
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cadências</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sequências multi-toque para leads frios — WhatsApp + email.
          </p>
        </div>
        <Link
          href="/dashboard/prospeccao/cadencias/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Nova cadência
        </Link>
      </div>

      {cadences.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
          <Repeat className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400 mb-3">Nenhuma cadência criada ainda.</p>
          <Link
            href="/dashboard/prospeccao/cadencias/nova"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Criar primeira cadência
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cadences.map((c) => {
            const counts = {
              whatsapp: c.steps.filter((s) => s.type === "send_whatsapp").length,
              email: c.steps.filter((s) => s.type === "send_email").length,
              delay: c.steps.filter((s) => s.type === "delay").length,
            };
            const totalDays = c.steps
              .filter((s) => s.type === "delay")
              .reduce(
                (acc, s) => acc + (s.delayDays ?? 0) + Math.floor((s.delayHours ?? 0) / 24),
                0
              );
            return (
              <Link
                key={c.id}
                href={`/dashboard/prospeccao/cadencias/${c.id}`}
                className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm flex-1">{c.name}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      c.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {c.isActive ? "Ativa" : "Pausada"}
                  </span>
                </div>
                {c.description && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {counts.whatsapp > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-green-600" /> {counts.whatsapp}
                    </span>
                  )}
                  {counts.email > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3 text-blue-600" /> {counts.email}
                    </span>
                  )}
                  {totalDays > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-600" /> {totalDays}d
                    </span>
                  )}
                  <span className="ml-auto text-slate-400">
                    {c.enrolledCount} inscrit{c.enrolledCount !== 1 ? "os" : "o"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
