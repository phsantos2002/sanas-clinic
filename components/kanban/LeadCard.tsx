"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Phone, MoreHorizontal, MessageCircle, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SourceIcon, sourceConfig } from "@/components/icons/SourceIcons";
import { deleteLead } from "@/app/actions/leads";
import { toast } from "sonner";
import type { Lead } from "@/types";

type Props = {
  lead: Lead;
  onClickLead?: (leadId: string) => void;
};

export function LeadCard({ lead, onClickLead }: Props) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = lead.source ? sourceConfig[lead.source] : null;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteLead(lead.id);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Lead excluído");
    }
    setConfirmDelete(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm group cursor-pointer hover:shadow-md hover:border-slate-200 transition-all"
      onClick={() => onClickLead?.(lead.id)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
          <div className="flex items-center gap-1 mt-1 text-slate-400">
            <Phone className="h-3 w-3" />
            <span className="text-xs">{lead.phone}</span>
          </div>

          {lead.email && (
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lead.email}</p>
          )}

          {config && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <div className={`flex items-center justify-center w-5 h-5 rounded ${config.bg}`}>
                <SourceIcon source={lead.source} size={12} />
              </div>
              <span className={`text-[10px] font-medium ${config.text}`}>
                {config.label}
              </span>
              {lead.campaign && (
                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={lead.campaign}>
                  {lead.campaign}
                </span>
              )}
            </div>
          )}
        </div>

        <DropdownMenu onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-900 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClickLead?.(lead.id);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/chat?leadId=${lead.id}`);
              }}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-2" />
              Abrir Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                if (!confirmDelete) {
                  e.preventDefault();
                  setConfirmDelete(true);
                  return;
                }
                handleDelete();
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {deleting ? "Excluindo..." : confirmDelete ? "Confirmar Exclusão" : "Excluir"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
