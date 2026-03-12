"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import { getStageColor } from "@/components/icons/SourceIcons";
import type { KanbanColumn as KanbanColumnType } from "@/types";

type Props = {
  column: KanbanColumnType;
  onClickLead?: (leadId: string) => void;
};

export function KanbanColumn({ column, onClickLead }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const color = getStageColor(column.name);

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${color.bg}`} />
          <h3 className="text-sm font-semibold text-slate-900">{column.name}</h3>
        </div>
        <span className={`text-xs font-bold ${color.text} ${color.bg} rounded-full px-2.5 py-0.5`}>
          {column.leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2.5 min-h-[200px] p-2.5 rounded-2xl border-2 transition-all ${
          isOver
            ? "border-indigo-300 bg-indigo-50/50 shadow-inner"
            : "border-dashed border-slate-200 bg-slate-50/30"
        }`}
      >
        <SortableContext
          items={column.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClickLead={onClickLead} />
          ))}
        </SortableContext>

        {column.leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-300">Arraste leads aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
