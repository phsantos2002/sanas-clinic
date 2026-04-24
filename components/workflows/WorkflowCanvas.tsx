"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, ZoomIn, ZoomOut, Maximize2, Save, Play, Trash2 } from "lucide-react";
import { WorkflowNode, type CanvasNode } from "./WorkflowNode";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { toast } from "sonner";

export type CanvasEdge = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: "default" | "yes" | "no";
};

type Props = {
  workflowId: string;
  initialNodes: CanvasNode[];
  initialEdges: CanvasEdge[];
  stages: { id: string; name: string }[];
  onSave: (nodes: CanvasNode[], edges: CanvasEdge[]) => Promise<void>;
};

const NODE_TYPES = [
  { type: "trigger", subtype: "new_lead", label: "Novo Lead", color: "bg-violet-500" },
  { type: "trigger", subtype: "stage_change", label: "Mudanca de Etapa", color: "bg-violet-500" },
  { type: "trigger", subtype: "tag_added", label: "Tag Adicionada", color: "bg-violet-500" },
  { type: "condition", subtype: "tag_check", label: "Verificar Tag", color: "bg-amber-500" },
  { type: "condition", subtype: "stage_check", label: "Verificar Etapa", color: "bg-amber-500" },
  { type: "action", subtype: "send_whatsapp", label: "Enviar WhatsApp", color: "bg-teal-500" },
  { type: "action", subtype: "move_stage", label: "Mover Etapa", color: "bg-teal-500" },
  { type: "action", subtype: "add_tag", label: "Adicionar Tag", color: "bg-teal-500" },
  { type: "action", subtype: "remove_tag", label: "Remover Tag", color: "bg-teal-500" },
  {
    type: "action",
    subtype: "assign_attendant",
    label: "Atribuir Atendente",
    color: "bg-teal-500",
  },
  { type: "action", subtype: "delay", label: "Aguardar", color: "bg-slate-500" },
] as const;

export function WorkflowCanvas({ workflowId, initialNodes, initialEdges, stages, onSave }: Props) {
  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNodeMenu, setShowNodeMenu] = useState<{ x: number; y: number } | null>(null);
  const [connecting, setConnecting] = useState<{ nodeId: string; port: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, panX: 0, panY: 0 });

  // Auto-save with debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await onSave(nodes, edges);
      setSaving(false);
    }, 2000);
  }, [nodes, edges, onSave]);

  useEffect(() => {
    triggerAutoSave();
  }, [nodes, edges]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === canvasRef.current ||
      (e.target as HTMLElement).classList.contains("canvas-bg")
    ) {
      setIsDragging(true);
      dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
      setSelectedNode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setShowNodeMenu({
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    });
  };

  const addNode = (type: string, subtype: string, label: string) => {
    if (!showNodeMenu) return;
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      type: type as CanvasNode["type"],
      subtype,
      position: { x: showNodeMenu.x, y: showNodeMenu.y },
      config: {},
      label,
    };
    setNodes((prev) => [...prev, newNode]);
    setShowNodeMenu(null);
    setSelectedNode(newNode.id);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const moveNode = (nodeId: string, position: { x: number; y: number }) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, position } : n)));
  };

  const startConnection = (nodeId: string, port: string) => {
    setConnecting({ nodeId, port });
  };

  const endConnection = (targetNodeId: string) => {
    if (!connecting || connecting.nodeId === targetNodeId) {
      setConnecting(null);
      return;
    }
    const exists = edges.some(
      (e) => e.sourceNodeId === connecting.nodeId && e.targetNodeId === targetNodeId
    );
    if (!exists) {
      setEdges((prev) => [
        ...prev,
        {
          id: `edge-${Date.now()}`,
          sourceNodeId: connecting.nodeId,
          targetNodeId,
          sourcePort: connecting.port as CanvasEdge["sourcePort"],
        },
      ]);
    }
    setConnecting(null);
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, unknown>) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, config } : n)));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(nodes, edges);
    setSaving(false);
    toast.success("Workflow salvo");
  };

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      {/* Canvas area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-400 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[10px] text-slate-400">Salvando...</span>}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
            >
              <Save className="h-3.5 w-3.5" /> Salvar
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          <div
            className="canvas-bg absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, #e2e8f0 1px, transparent 1px)`,
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.sourceNodeId);
              const target = nodes.find((n) => n.id === edge.targetNodeId);
              if (!source || !target) return null;
              const sx = source.position.x + 120;
              const sy = source.position.y + 30;
              const tx = target.position.x;
              const ty = target.position.y + 30;
              const mx = (sx + tx) / 2;
              return (
                <g key={edge.id}>
                  <path
                    d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`}
                    fill="none"
                    stroke={
                      edge.sourcePort === "yes"
                        ? "#10b981"
                        : edge.sourcePort === "no"
                          ? "#ef4444"
                          : "#94a3b8"
                    }
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>

          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              position: "absolute",
            }}
          >
            {nodes.map((node) => (
              <WorkflowNode
                key={node.id}
                node={node}
                isSelected={selectedNode === node.id}
                isConnecting={connecting !== null}
                onClick={() => setSelectedNode(node.id)}
                onMove={(pos) => moveNode(node.id, pos)}
                onDelete={() => deleteNode(node.id)}
                onStartConnect={(port) => startConnection(node.id, port)}
                onEndConnect={() => endConnection(node.id)}
              />
            ))}
          </div>

          {/* Node creation menu */}
          {showNodeMenu && (
            <div
              className="absolute z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-2 w-56 max-h-80 overflow-y-auto"
              style={{ left: showNodeMenu.x * zoom + pan.x, top: showNodeMenu.y * zoom + pan.y }}
            >
              <p className="text-[10px] text-slate-400 uppercase px-2 py-1">Adicionar no</p>
              {NODE_TYPES.map((nt) => (
                <button
                  key={`${nt.type}-${nt.subtype}`}
                  onClick={() => addNode(nt.type, nt.subtype, nt.label)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-50"
                >
                  <div className={`h-2 w-2 rounded-full ${nt.color}`} />
                  {nt.label}
                </button>
              ))}
              <button
                onClick={() => setShowNodeMenu(null)}
                className="w-full text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 mt-1 border-t border-slate-100"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Plus className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Duplo clique para adicionar um no</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config panel */}
      {selectedNodeData && (
        <NodeConfigPanel
          node={selectedNodeData}
          stages={stages}
          onUpdate={(config) => updateNodeConfig(selectedNodeData.id, config)}
          onClose={() => setSelectedNode(null)}
          onDelete={() => deleteNode(selectedNodeData.id)}
        />
      )}
    </div>
  );
}
