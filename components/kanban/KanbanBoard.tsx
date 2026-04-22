"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useState, useEffect } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";
import { moveLead } from "@/app/actions/leads";
import { bulkMoveStage } from "@/app/actions/bulkActions";
import { toast } from "sonner";
import type { KanbanColumn as KanbanColumnType } from "@/types";

type Attendant = { id: string; name: string; role: string };
type StageLite = { id: string; name: string };

type Props = {
  columns: KanbanColumnType[];
  onClickLead?: (leadId: string) => void;
  onEditLead?: (leadId: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (leadId: string) => void;
  selectionMode?: boolean;
  attendants?: Attendant[];
  stages?: StageLite[];
};

export function KanbanBoard({
  columns: initialColumns,
  onClickLead,
  onEditLead,
  selectedIds,
  onToggleSelect,
  selectionMode,
  attendants,
  stages,
}: Props) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeLead = activeId
    ? columns.flatMap((c) => c.leads).find((l) => l.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = columns.find((c) => c.leads.some((l) => l.id === leadId));

    const targetColumn =
      columns.find((c) => c.id === overId) ??
      columns.find((c) => c.leads.some((l) => l.id === overId));

    if (!sourceColumn || !targetColumn) return;
    if (sourceColumn.id === targetColumn.id) return;

    // Multi-drag: se o card arrastado está selecionado e há mais de um selecionado,
    // move todos os selecionados de uma vez.
    const isMultiDrag = !!(selectedIds && selectedIds.size > 1 && selectedIds.has(leadId));
    const idsToMove = isMultiDrag ? Array.from(selectedIds!) : [leadId];

    setColumns((prev) => {
      const allLeads = prev.flatMap((c) => c.leads);
      const movingLeads = idsToMove
        .map((id) => allLeads.find((l) => l.id === id))
        .filter((l): l is NonNullable<typeof l> => !!l);
      const movingIds = new Set(movingLeads.map((l) => l.id));

      return prev.map((col) => {
        if (col.id === targetColumn.id) {
          const kept = col.leads.filter((l) => !movingIds.has(l.id));
          const incoming = movingLeads.map((l) => ({ ...l, stageId: targetColumn.id }));
          return { ...col, leads: [...kept, ...incoming] };
        }
        return { ...col, leads: col.leads.filter((l) => !movingIds.has(l.id)) };
      });
    });

    const result = isMultiDrag
      ? await bulkMoveStage(idsToMove, targetColumn.id)
      : await moveLead(leadId, targetColumn.id);

    if (!result.success) {
      toast.error(result.error);
      setColumns(initialColumns);
    } else if (isMultiDrag) {
      toast.success(`${idsToMove.length} leads movidos`);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onClickLead={onClickLead}
            onEditLead={onEditLead}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            selectionMode={selectionMode}
            attendants={attendants}
            stages={stages}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="relative">
            <LeadCard lead={activeLead} />
            {selectedIds && selectedIds.size > 1 && selectedIds.has(activeLead.id) && (
              <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-semibold rounded-full h-7 min-w-7 px-2 flex items-center justify-center shadow-lg">
                +{selectedIds.size - 1}
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
