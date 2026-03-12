"use client";

import { SourceIcon, sourceConfig, getStageColor } from "@/components/icons/SourceIcons";
import type { Lead } from "@/types";

type Props = {
  leads: Lead[];
  onClickLead: (leadId: string) => void;
};

function formatDateTime(date: Date) {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

export function LeadsTable({ leads, onClickLead }: Props) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-slate-400 bg-white rounded-2xl border border-slate-100">
        Nenhum lead encontrado.
      </div>
    );
  }

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Contato</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Origem</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Etapa da Jornada</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Primeira Mensagem</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ultima Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const config = lead.source ? sourceConfig[lead.source] : sourceConfig.unknown;
              const stageColor = lead.stage ? getStageColor(lead.stage.name) : null;
              const created = formatDateTime(lead.createdAt);
              const updated = formatDateTime(lead.updatedAt);

              return (
                <tr
                  key={lead.id}
                  onClick={() => onClickLead(lead.id)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{lead.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.phone}</p>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${config?.bg ?? "bg-slate-50"}`}>
                        <SourceIcon source={lead.source} size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {config?.label ?? "Não rastreada"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {lead.campaign
                            ? `Via ${lead.campaign}`
                            : (config?.subtitle ?? "")}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    {lead.stage ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${stageColor?.bg ?? "bg-slate-100"} ${stageColor?.text ?? "text-slate-700"}`}>
                        {lead.stage.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm text-slate-700">{created.date}</p>
                      <p className="text-[11px] text-slate-400">{created.time}</p>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm text-slate-700">{updated.date}</p>
                      <p className="text-[11px] text-slate-400">{updated.time}</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
