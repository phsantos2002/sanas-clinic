"use client";

import { Badge } from "@/components/ui/badge";
import type { Lead } from "@/types";

type Props = {
  leads: Lead[];
  onClickLead: (leadId: string) => void;
};

const sourceLabels: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  whatsapp: "WhatsApp",
  manual: "Manual",
};

const sourceIcons: Record<string, string> = {
  meta: "∞",
  google: "▲",
  whatsapp: "📱",
  manual: "✏️",
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadsTable({ leads, onClickLead }: Props) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-slate-400">
        Nenhum lead encontrado.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Contato</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Origem</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Etapa da Jornada</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Criado em</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onClickLead(lead.id)}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{lead.name}</p>
                    <p className="text-xs text-slate-400">{lead.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{sourceIcons[lead.source ?? ""] ?? "❓"}</span>
                    <span className="text-xs text-slate-600">
                      {lead.source ? (sourceLabels[lead.source] ?? lead.source) : "Não rastreada"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {lead.stage ? (
                    <Badge variant="secondary" className="text-xs py-0 h-5">
                      {lead.stage.name}
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {formatDate(lead.createdAt)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {formatDate(lead.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
