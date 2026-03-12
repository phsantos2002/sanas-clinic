"use client";

import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Phone, Trash2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteLead } from "@/app/actions/leads";
import { toast } from "sonner";
import type { Lead } from "@/types";

type Props = {
  lead: Lead;
};

export function LeadCard({ lead }: Props) {
  const router = useRouter();
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

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    const result = await deleteLead(lead.id);
    if (!result.success) {
      toast.error(result.error);
    }
  }

  function handleOpenChat(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/dashboard/chat?leadId=${lead.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-zinc-200 rounded-lg p-3 shadow-sm group"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-zinc-400 hover:text-zinc-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-black truncate">{lead.name}</p>
          <div className="flex items-center gap-1 mt-1 text-zinc-500">
            <Phone className="h-3 w-3" />
            <span className="text-xs">{lead.phone}</span>
          </div>

          {lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.tags.map(({ tag }) => (
                <Badge key={tag.id} variant="secondary" className="text-xs py-0 h-5">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-black"
            onClick={handleOpenChat}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
