"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Phone, MoreHorizontal, MessageCircle, Eye, Trash2, ArrowRight, Bot, Clock } from "lucide-react";
import { LeadScoreBadge } from "@/components/ui/LeadScoreBadge";
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
  stagnationThreshold?: number | null;
  onMoveNext?: (leadId: string) => void;
  // Bulk selection
  selected?: boolean;
  onToggleSelect?: (leadId: string) => void;
  selectionMode?: boolean;
};

function getDaysInStage(lead: Lead): number | null {
  if (!lead.lastInteractionAt) return null;
  return Math.floor((Date.now() - new Date(lead.lastInteractionAt).getTime()) / 86400000);
}

export function LeadCard({
  lead,
  onClickLead,
  stagnationThreshold,
  onMoveNext,
  selected = false,
  onToggleSelect,
  selectionMode = false,
}: Props) {
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
  const daysInStage = getDaysInStage(lead);
  const isStagnant = stagnationThreshold && daysInStage && daysInStage > stagnationThreshold;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteLead(lead.id);
    setDeleting(false);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success(`Lead ${lead.name} excluido`);
    }
    setConfirmDelete(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white border rounded-xl p-3.5 shadow-sm group cursor-pointer hover:shadow-md transition-all ${
        selected
          ? "border-indigo-400 ring-2 ring-indigo-200"
          : isStagnant
            ? "border-amber-300 ring-1 ring-amber-200"
            : "border-slate-100 hover:border-slate-200"
      }`}
      onClick={(e) => {
        if (selectionMode && onToggleSelect) {
          e.preventDefault();
          onToggleSelect(lead.id);
          return;
        }
        onClickLead?.(lead.id);
      }}
    >
      {/* Bulk select checkbox */}
      {onToggleSelect && (
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${
            selected || selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(lead.id);
          }}
        >
          <div
            className={`h-4 w-4 rounded border-2 flex items-center justify-center cursor-pointer ${
              selected
                ? "bg-indigo-600 border-indigo-600"
                : "bg-white border-slate-300 hover:border-indigo-400"
            }`}
          >
            {selected && (
              <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      )}
      {/* Quick Actions on Hover (2.7) */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-md opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/chat?leadId=${lead.id}`); }}
          className="p-1 text-slate-400 hover:text-green-600 rounded transition-colors"
          title="Abrir chat"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClickLead?.(lead.id); }}
          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
          title="Editar"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {onMoveNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onMoveNext(lead.id); }}
            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
            title="Proxima etapa"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Avatar initial */}
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
              lead.scoreLabel === "vip" ? "bg-violet-500" :
              lead.scoreLabel === "quente" ? "bg-rose-500" :
              lead.scoreLabel === "morno" ? "bg-amber-500" :
              "bg-slate-400"
            }`}>
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
            {lead.aiEnabled && (
              <span title="IA ativa"><Bot className="h-3 w-3 text-indigo-400 shrink-0" /></span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1 text-slate-400">
            <Phone className="h-3 w-3" />
            <span className="text-xs">{lead.phone}</span>
          </div>

          {/* Time in stage indicator (2.6) */}
          {daysInStage !== null && daysInStage > 0 && (
            <div className={`flex items-center gap-1 mt-1 text-[10px] ${
              isStagnant ? "text-amber-600" : "text-slate-400"
            }`}>
              <Clock className="h-2.5 w-2.5" />
              ha {daysInStage}d nesta etapa
              {isStagnant && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded" title={`Threshold: ${stagnationThreshold} dias`}>
                  parado
                </span>
              )}
            </div>
          )}

          {/* Source + Score + Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {config && (
              <div className={`flex items-center justify-center w-5 h-5 rounded ${config.bg}`}>
                <SourceIcon source={lead.source} size={12} />
              </div>
            )}
            {lead.score > 0 && (
              <LeadScoreBadge score={lead.score} label={lead.scoreLabel} variant="compact" />
            )}
            {lead.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClickLead?.(lead.id); }}>
              <Eye className="h-3.5 w-3.5 mr-2" /> Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/chat?leadId=${lead.id}`); }}>
              <MessageCircle className="h-3.5 w-3.5 mr-2" /> Abrir Chat
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => { if (!confirmDelete) { e.preventDefault(); setConfirmDelete(true); return; } handleDelete(); }}
              onClick={(e) => e.stopPropagation()}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {deleting ? "Excluindo..." : confirmDelete ? "Confirmar Exclusao" : "Excluir"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
