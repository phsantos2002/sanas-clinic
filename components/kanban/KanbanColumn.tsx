"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import type { KanbanColumn as KanbanColumnType } from "@/types";

type Props = {
  column: KanbanColumnType;
};

export function KanbanColumn({ column }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-black">{column.name}</h3>
        <span className="text-xs text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">
          {column.leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[200px] p-2 rounded-lg border-2 transition-colors ${
          isOver
            ? "border-black bg-zinc-50"
            : "border-dashed border-zinc-200 bg-zinc-50/50"
        }`}
      >
        <SortableContext
          items={column.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>

        {column.leads.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-zinc-400">Nenhum lead</p>
          </div>
        )}
      </div>
    </div>
  );
}
