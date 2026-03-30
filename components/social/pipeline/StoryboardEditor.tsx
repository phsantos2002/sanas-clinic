"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LayoutGrid, RefreshCw, Check, Loader2, Camera, Clock, Type, AlertCircle, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateStoryboardFrames, regenerateFrame, approveAllFrames, reorderFrames,
} from "@/app/actions/pipeline";

type Frame = {
  id: string; order: number; sceneTitle: string; narration: string; visualDescription: string;
  duration: number; cameraDirection: string | null; transition: string | null; textOverlay: string | null;
  imageUrl: string | null; imageStatus: string; isApproved: boolean;
};

function SortableFrameCard({ frame, onRegenerate, regeneratingId }: {
  frame: Frame; onRegenerate: (id: string) => void; regeneratingId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-slate-100 rounded-2xl overflow-hidden group">
      {/* Image */}
      <div className="h-44 bg-slate-50 flex items-center justify-center relative">
        {frame.imageUrl ? (
          <img src={frame.imageUrl} alt={frame.sceneTitle} className="w-full h-full object-cover" />
        ) : frame.imageStatus === "generating" ? (
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        ) : frame.imageStatus === "error" ? (
          <AlertCircle className="h-8 w-8 text-red-300" />
        ) : (
          <LayoutGrid className="h-8 w-8 text-slate-200" />
        )}
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 h-7 w-7 bg-white/80 backdrop-blur rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-slate-500" />
        </button>
        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
          Cena {frame.order + 1}
        </span>
        {frame.isApproved && (
          <span className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-0.5">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <h4 className="font-medium text-slate-900 text-sm">{frame.sceneTitle}</h4>
        <p className="text-xs text-slate-500 line-clamp-2">{frame.narration}</p>

        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
          {frame.cameraDirection && (
            <span className="flex items-center gap-0.5"><Camera className="h-2.5 w-2.5" />{frame.cameraDirection}</span>
          )}
          {frame.transition && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded">{frame.transition}</span>
          )}
          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{frame.duration}s</span>
          {frame.textOverlay && (
            <span className="flex items-center gap-0.5"><Type className="h-2.5 w-2.5" />"{frame.textOverlay}"</span>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onRegenerate(frame.id)}
            disabled={regeneratingId === frame.id}
            className="text-xs text-slate-500 hover:text-violet-600 flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${regeneratingId === frame.id ? "animate-spin" : ""}`} /> Regenerar
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoryboardEditor({ storyId, frames: initialFrames, status }: {
  storyId: string; frames: Frame[]; status: string;
}) {
  const [frames, setFrames] = useState(initialFrames);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = frames.findIndex((f) => f.id === active.id);
    const newIndex = frames.findIndex((f) => f.id === over.id);

    const reordered = arrayMove(frames, oldIndex, newIndex).map((f, i) => ({ ...f, order: i }));
    setFrames(reordered);

    await reorderFrames(storyId, reordered.map((f) => f.id));
    toast.success("Ordem atualizada!");
  }, [frames, storyId]);

  const handleGenerateAll = async () => {
    setGenerating(true);
    const result = await generateStoryboardFrames(storyId);
    setGenerating(false);
    if (result.success) { toast.success("Frames gerados!"); window.location.reload(); }
    else toast.error(result.success ? "Erro" : result.error);
  };

  const handleRegenerate = async (frameId: string) => {
    setRegeneratingId(frameId);
    const result = await regenerateFrame(frameId);
    setRegeneratingId(null);
    if (result.success) { toast.success("Frame regenerado!"); window.location.reload(); }
    else toast.error(result.success ? "Erro" : result.error);
  };

  const handleApproveAll = async () => {
    const result = await approveAllFrames(storyId);
    if (result.success) { toast.success("Aprovados! Proximo: gerar video."); window.location.reload(); }
  };

  const allDone = frames.length > 0 && frames.every((f) => f.imageStatus === "done");
  const hasPending = frames.some((f) => f.imageStatus === "pending");
  const doneCount = frames.filter((f) => f.imageStatus === "done").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold text-slate-900 text-sm">
            Storyboard ({doneCount}/{frames.length} frames)
          </h3>
        </div>
        <div className="flex gap-2">
          {hasPending && (
            <button onClick={handleGenerateAll} disabled={generating}
              className="px-3 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-medium hover:bg-violet-700 disabled:opacity-50">
              {generating ? `Gerando ${doneCount}/${frames.length}...` : "Gerar Todos os Frames"}
            </button>
          )}
          {allDone && (status === "storyboard_review" || status === "storyboarding") && (
            <button onClick={handleApproveAll}
              className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 flex items-center gap-1">
              <Check className="h-3 w-3" /> Aprovar Tudo e Gerar Video
            </button>
          )}
        </div>
      </div>

      {frames.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <LayoutGrid className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Gere o roteiro primeiro para criar o storyboard.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={frames.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {frames.map((frame) => (
                <SortableFrameCard
                  key={frame.id}
                  frame={frame}
                  onRegenerate={handleRegenerate}
                  regeneratingId={regeneratingId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
