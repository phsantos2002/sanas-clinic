"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import { KanbanColumnImportButton } from "./KanbanColumnImportButton";
import { getStageColor } from "@/components/icons/SourceIcons";
import type { KanbanColumn as KanbanColumnType } from "@/types";

type Attendant = { id: string; name: string; role: string };
type StageLite = { id: string; name: string };

type Props = {
  column: KanbanColumnType;
  onClickLead?: (leadId: string) => void;
  onEditLead?: (leadId: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  selectionMode?: boolean;
  attendants?: Attendant[];
  stages?: StageLite[];
};

export function KanbanColumn({
  column,
  onClickLead,
  selectedIds,
  onToggleSelect,
  selectionMode,
  attendants,
  stages,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const color = getStageColor(column.name);

  return (
    <div className="flex flex-col w-64 sm:w-72 flex-shrink-0">
      <div
        className={`flex items-center justify-between mb-3 pl-2.5 pr-1.5 py-2 rounded-xl bg-white border border-slate-100 shadow-sm`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1 h-5 rounded-full ${color.bg}`} />
          <h3 className="text-sm font-semibold text-slate-900 truncate">{column.name}</h3>
          <span
            className={`text-[11px] font-semibold ${color.text} ${color.bg} rounded-full px-2 py-0.5`}
          >
            {column.leads.length}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {attendants && stages && (
            <KanbanColumnImportButton
              stage={{ id: column.id, name: column.name }}
              attendants={attendants}
              stages={stages}
            />
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2.5 min-h-[200px] p-2.5 rounded-2xl border-2 transition-all ${
          isOver
            ? "border-indigo-400 bg-indigo-50 shadow-inner ring-2 ring-indigo-100"
            : "border-dashed border-slate-200 bg-slate-50/40"
        }`}
      >
        <SortableContext
          items={column.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClickLead={onClickLead}
              selected={selectedIds?.has(lead.id)}
              onToggleSelect={onToggleSelect}
              selectionMode={selectionMode}
            />
          ))}
        </SortableContext>

        {column.leads.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 py-6">
            <div className={`w-8 h-8 rounded-full ${color.bg} opacity-30`} />
            <p className="text-xs text-slate-300">Arraste leads aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
