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
import { toast } from "sonner";
import type { KanbanColumn as KanbanColumnType } from "@/types";

type Props = {
  columns: KanbanColumnType[];
  onClickLead?: (leadId: string) => void;
  onEditLead?: (leadId: string) => void;
};

export function KanbanBoard({ columns: initialColumns, onClickLead, onEditLead }: Props) {
  const [columns, setColumns] = useState(initialColumns);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

    const sourceColumn = columns.find((c) =>
      c.leads.some((l) => l.id === leadId)
    );

    const targetColumn =
      columns.find((c) => c.id === overId) ??
      columns.find((c) => c.leads.some((l) => l.id === overId));

    if (!sourceColumn || !targetColumn) return;
    if (sourceColumn.id === targetColumn.id) return;

    setColumns((prev) => {
      const lead = prev
        .find((c) => c.id === sourceColumn.id)
        ?.leads.find((l) => l.id === leadId);
      if (!lead) return prev;

      return prev.map((col) => {
        if (col.id === sourceColumn.id) {
          return { ...col, leads: col.leads.filter((l) => l.id !== leadId) };
        }
        if (col.id === targetColumn.id) {
          return {
            ...col,
            leads: [...col.leads, { ...lead, stageId: targetColumn.id }],
          };
        }
        return col;
      });
    });

    const result = await moveLead(leadId, targetColumn.id);
    if (!result.success) {
      toast.error(result.error);
      setColumns(initialColumns);
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
          <KanbanColumn key={column.id} column={column} onClickLead={onClickLead} onEditLead={onEditLead} />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
