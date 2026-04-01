"use client";

import { useRef, useState } from "react";
import { Trash2, Zap, GitBranch, Play, Clock, MessageCircle, ArrowRight, Tag, Users, TrendingUp } from "lucide-react";

export type CanvasNode = {
  id: string;
  type: "trigger" | "condition" | "action" | "end";
  subtype: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  label: string;
};

const NODE_ICONS: Record<string, typeof Zap> = {
  new_lead: Users,
  stage_change: ArrowRight,
  tag_added: Tag,
  score_check: TrendingUp,
  tag_check: Tag,
  stage_check: GitBranch,
  send_whatsapp: MessageCircle,
  move_stage: ArrowRight,
  add_tag: Tag,
  remove_tag: Tag,
  assign_attendant: Users,
  update_score: TrendingUp,
  delay: Clock,
};

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-700" },
  condition: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
  action: { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700" },
  end: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" },
};

type Props = {
  node: CanvasNode;
  isSelected: boolean;
  isConnecting: boolean;
  onClick: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onDelete: () => void;
  onStartConnect: (port: string) => void;
  onEndConnect: () => void;
};

export function WorkflowNode({ node, isSelected, isConnecting, onClick, onMove, onDelete, onStartConnect, onEndConnect }: Props) {
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, nodeX: 0, nodeY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const colors = NODE_COLORS[node.type] || NODE_COLORS.action;
  const Icon = NODE_ICONS[node.subtype] || Zap;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, nodeX: node.position.x, nodeY: node.position.y };
    setIsDragging(true);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      onMove({ x: dragRef.current.nodeX + dx, y: dragRef.current.nodeY + dy });
    };

    const handleMouseUp = () => {
      dragRef.current.dragging = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      className={`absolute select-none cursor-pointer group ${isDragging ? "z-50" : "z-10"}`}
      style={{ left: node.position.x, top: node.position.y }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseUp={() => { if (isConnecting) onEndConnect(); }}
    >
      <div className={`relative w-[240px] rounded-xl border-2 shadow-sm transition-all ${colors.bg} ${
        isSelected ? `${colors.border} shadow-md ring-2 ring-offset-2 ring-indigo-300` : `${colors.border}`
      } hover:shadow-md`}>

        {/* Input port */}
        {node.type !== "trigger" && (
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-100 cursor-crosshair z-20"
            onMouseUp={(e) => { e.stopPropagation(); onEndConnect(); }}
          />
        )}

        {/* Content */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
              node.type === "trigger" ? "bg-violet-100" :
              node.type === "condition" ? "bg-amber-100" : "bg-teal-100"
            }`}>
              <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${colors.text} truncate`}>{node.label}</p>
              <p className="text-[10px] text-slate-400 capitalize">{node.type}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          {/* Config preview */}
          {node.config && Object.keys(node.config).length > 0 && (
            <div className="mt-1.5 px-2 py-1 bg-white/60 rounded text-[10px] text-slate-500 truncate">
              {node.subtype === "send_whatsapp" && (node.config.message as string)?.slice(0, 40)}
              {node.subtype === "delay" && `${node.config.minutes || 0} minutos`}
              {node.subtype === "add_tag" && `Tag: ${node.config.tag}`}
              {node.subtype === "update_score" && `Delta: ${node.config.delta}`}
            </div>
          )}
        </div>

        {/* Output ports */}
        {node.type === "condition" ? (
          <>
            <div
              className="absolute -right-2 top-1/3 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-400 hover:bg-emerald-200 cursor-crosshair z-20"
              title="Sim"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect("yes"); }}
            />
            <div
              className="absolute -right-2 top-2/3 -translate-y-1/2 w-4 h-4 rounded-full bg-red-100 border-2 border-red-400 hover:bg-red-200 cursor-crosshair z-20"
              title="Nao"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect("no"); }}
            />
          </>
        ) : (
          <div
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-100 cursor-crosshair z-20"
            onMouseDown={(e) => { e.stopPropagation(); onStartConnect("default"); }}
          />
        )}
      </div>
    </div>
  );
}
