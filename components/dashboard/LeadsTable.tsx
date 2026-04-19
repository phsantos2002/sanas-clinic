"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SourceIcon, sourceConfig, getStageColor } from "@/components/icons/SourceIcons";
import { deleteLead } from "@/app/actions/leads";
import { toast } from "sonner";
import type { Lead } from "@/types";

type Props = {
  leads: Lead[];
  onClickLead: (leadId: string) => void;
  onEditLead?: (leadId: string) => void;
};

function formatDateTime(date: Date) {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

function ActionCell({
  lead,
  onClickLead,
  onEditLead,
}: {
  lead: Lead;
  onClickLead: (id: string) => void;
  onEditLead?: (id: string) => void;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const result = await deleteLead(lead.id);
    setDeleting(false);
    if (result.success) {
      toast.success("Lead excluído");
    } else {
      toast.error(result.error);
    }
    setConfirmDelete(false);
  }

  return (
    <DropdownMenu onOpenChange={() => setConfirmDelete(false)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onClickLead(lead.id);
          }}
        >
          <Eye className="h-3.5 w-3.5 mr-2" /> Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/chat?leadId=${lead.id}`);
          }}
        >
          <MessageCircle className="h-3.5 w-3.5 mr-2" /> Abrir Chat
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEditLead?.(lead.id);
          }}
        >
          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          {deleting ? "Excluindo..." : confirmDelete ? "Confirmar Exclusão" : "Excluir"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LeadsTable({ leads, onClickLead, onEditLead }: Props) {
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
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contato
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Origem
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Etapa da Jornada
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Primeira Mensagem
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Ultima Mensagem
              </th>
              <th className="w-12"></th>
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
                      <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {lead.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{lead.phone}</p>
                      {lead.email && (
                        <p className="text-[11px] text-slate-300 mt-0.5">{lead.email}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg ${config?.bg ?? "bg-slate-50"}`}
                      >
                        <SourceIcon source={lead.source} size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {config?.label ?? "Não rastreada"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {lead.campaign ? `Via ${lead.campaign}` : (config?.subtitle ?? "")}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    {lead.stage ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${stageColor?.bg ?? "bg-slate-100"} ${stageColor?.text ?? "text-slate-700"}`}
                      >
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

                  <td className="px-2 py-3.5">
                    <ActionCell lead={lead} onClickLead={onClickLead} onEditLead={onEditLead} />
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
