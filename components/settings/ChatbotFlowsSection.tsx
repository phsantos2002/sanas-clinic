"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Bot, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import {
  saveFlow,
  deleteFlow,
  toggleFlowActive,
  getFlow,
  type ChatbotFlowSummary,
} from "@/app/actions/chatbot";

type Props = {
  flows: ChatbotFlowSummary[];
};

type EditorNode = {
  key: string;
  message: string;
  next: string; // empty = no auto-next
  buttons: { label: string; next: string }[];
  action: "" | "pause_ai" | "tag" | "stage" | "noop";
  actionArg: string;
};

const TRIGGER_OPTIONS = [
  { value: "new_lead", label: "Novo lead chegou" },
  { value: "manual", label: "Manual (iniciado por agente)" },
  { value: "keyword:agendar", label: "Mensagem contém 'agendar'" },
  { value: "keyword:preço", label: "Mensagem contém 'preço'" },
];

export function ChatbotFlowsSection({ flows }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [, startTransition] = useTransition();

  async function openEditor(id: string) {
    setEditingId(id);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o flow "${name}"?`)) return;
    const res = await deleteFlow(id);
    if (res.success) {
      toast.success("Flow excluído");
      startTransition(() => router.refresh());
    } else toast.error(res.error);
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await toggleFlowActive(id, !current);
    if (res.success) {
      toast.success(!current ? "Flow ativado" : "Flow pausado");
      startTransition(() => router.refresh());
    } else toast.error(res.error);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-1.5">
            <Bot className="h-4 w-4" /> Fluxos de chatbot
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Roteiros de conversa que rodam antes da IA quando um gatilho é acionado.
          </p>
        </div>
        <button
          onClick={() => setEditingId("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Novo flow
        </button>
      </div>

      {flows.length === 0 ? (
        <div className="text-center py-6 text-sm text-slate-400">
          Nenhum flow criado ainda. Crie um para automatizar a primeira interação.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 -mx-2">
          {flows.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-2 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 truncate">{f.name}</p>
                  {!f.isActive && (
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                      pausado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {TRIGGER_OPTIONS.find((t) => t.value === f.trigger)?.label ?? f.trigger}
                  <span className="ml-2">· {f.nodeCount} nós</span>
                </p>
              </div>
              <button
                onClick={() => handleToggle(f.id, f.isActive)}
                title={f.isActive ? "Pausar" : "Ativar"}
                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
              >
                {f.isActive ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
              </button>
              <button
                onClick={() => openEditor(f.id)}
                title="Editar"
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(f.id, f.name)}
                title="Excluir"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <FlowEditor
          flowId={editingId === "new" ? null : editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}

function FlowEditor({
  flowId,
  onClose,
  onSaved,
}: {
  flowId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("new_lead");
  const [isActive, setIsActive] = useState(true);
  const [startKey, setStartKey] = useState("welcome");
  const [nodes, setNodes] = useState<EditorNode[]>([
    {
      key: "welcome",
      message: "Olá! Como posso ajudar?",
      next: "",
      buttons: [],
      action: "",
      actionArg: "",
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!flowId);

  // Load existing flow when editing
  useEffect(() => {
    if (!flowId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getFlow(flowId).then((f) => {
      if (cancelled) return;
      if (f) {
        setName(f.name);
        setTrigger(f.trigger);
        setIsActive(f.isActive);
        setStartKey(f.nodes.start);
        setNodes(
          Object.entries(f.nodes.nodes).map(([key, n]) => ({
            key,
            message: n.message,
            next: n.next ?? "",
            buttons: n.buttons ?? [],
            action: (n.action as EditorNode["action"]) ?? "",
            actionArg: n.actionArg ?? "",
          }))
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [flowId]);

  function addNode() {
    let i = nodes.length;
    let key = `node${i}`;
    while (nodes.some((n) => n.key === key)) {
      i++;
      key = `node${i}`;
    }
    setNodes([...nodes, { key, message: "", next: "", buttons: [], action: "", actionArg: "" }]);
  }

  function updateNode(idx: number, patch: Partial<EditorNode>) {
    setNodes(nodes.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  }

  function removeNode(idx: number) {
    setNodes(nodes.filter((_, i) => i !== idx));
  }

  function addButton(nodeIdx: number) {
    updateNode(nodeIdx, {
      buttons: [...nodes[nodeIdx].buttons, { label: "", next: "" }],
    });
  }

  function updateButton(
    nodeIdx: number,
    btnIdx: number,
    patch: Partial<{ label: string; next: string }>
  ) {
    const newButtons = nodes[nodeIdx].buttons.map((b, i) =>
      i === btnIdx ? { ...b, ...patch } : b
    );
    updateNode(nodeIdx, { buttons: newButtons });
  }

  function removeButton(nodeIdx: number, btnIdx: number) {
    updateNode(nodeIdx, {
      buttons: nodes[nodeIdx].buttons.filter((_, i) => i !== btnIdx),
    });
  }

  async function handleSave() {
    if (!name.trim()) return toast.error("Nome obrigatório");
    if (nodes.length === 0) return toast.error("Adicione ao menos um nó");
    if (!nodes.some((n) => n.key === startKey))
      return toast.error("Nó inicial não encontrado nos nós abaixo");

    const flowDef = {
      start: startKey,
      nodes: Object.fromEntries(
        nodes.map((n) => [
          n.key,
          {
            message: n.message,
            ...(n.next ? { next: n.next } : {}),
            ...(n.buttons.length > 0
              ? { buttons: n.buttons.filter((b) => b.label && b.next) }
              : {}),
            ...(n.action ? { action: n.action } : {}),
            ...(n.actionArg ? { actionArg: n.actionArg } : {}),
          },
        ])
      ),
    };

    setSaving(true);
    const res = await saveFlow({
      id: flowId ?? undefined,
      name: name.trim(),
      trigger,
      isActive,
      nodes: flowDef,
    });
    setSaving(false);

    if (res.success) {
      toast.success(flowId ? "Flow atualizado" : "Flow criado");
      onSaved();
    } else toast.error(res.error);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{flowId ? "Editar flow" : "Novo flow"}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Carregando...</div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Boas-vindas"
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Gatilho</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TRIGGER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Nó inicial</label>
                <select
                  value={startKey}
                  onChange={(e) => setStartKey(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {nodes.map((n) => (
                    <option key={n.key} value={n.key}>
                      {n.key}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Ativo
                </label>
              </div>
            </div>

            {/* Nodes editor */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Nós do fluxo</h4>
                <button
                  onClick={addNode}
                  className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Adicionar nó
                </button>
              </div>

              {nodes.map((node, idx) => {
                const otherKeys = nodes.filter((_, i) => i !== idx).map((n) => n.key);
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/40"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={node.key}
                        onChange={(e) =>
                          updateNode(idx, { key: e.target.value.replace(/\s+/g, "_") })
                        }
                        placeholder="ID do nó"
                        className="text-xs font-mono w-32 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {nodes.length > 1 && (
                        <button
                          onClick={() => removeNode(idx)}
                          className="ml-auto p-1 text-slate-400 hover:text-rose-600"
                          title="Remover nó"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <textarea
                      value={node.message}
                      onChange={(e) => updateNode(idx, { message: e.target.value })}
                      placeholder="Mensagem que será enviada"
                      rows={2}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                    />

                    {node.buttons.length === 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-slate-500">Próximo nó:</label>
                        <select
                          value={node.next}
                          onChange={(e) => updateNode(idx, { next: e.target.value })}
                          className="text-xs border border-slate-200 rounded px-2 py-1"
                        >
                          <option value="">— terminar (volta pra IA) —</option>
                          {otherKeys.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="space-y-1">
                      {node.buttons.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <input
                            value={b.label}
                            onChange={(e) => updateButton(idx, bIdx, { label: e.target.value })}
                            placeholder="Texto do botão"
                            className="text-xs flex-1 border border-slate-200 rounded px-2 py-1"
                          />
                          <span className="text-[10px] text-slate-400">→</span>
                          <select
                            value={b.next}
                            onChange={(e) => updateButton(idx, bIdx, { next: e.target.value })}
                            className="text-xs border border-slate-200 rounded px-2 py-1"
                          >
                            <option value="">selecione</option>
                            {otherKeys.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeButton(idx, bIdx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {node.buttons.length < 3 && (
                        <button
                          onClick={() => addButton(idx)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800"
                        >
                          + Adicionar botão (max 3)
                        </button>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <label className="text-[10px] text-slate-500">Ação ao chegar neste nó:</label>
                      <select
                        value={node.action}
                        onChange={(e) =>
                          updateNode(idx, { action: e.target.value as EditorNode["action"] })
                        }
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                      >
                        <option value="">nenhuma</option>
                        <option value="pause_ai">Pausar IA (handoff humano)</option>
                        <option value="tag">Adicionar tag</option>
                        <option value="stage">Mover para etapa</option>
                      </select>
                      {(node.action === "tag" || node.action === "stage") && (
                        <input
                          value={node.actionArg}
                          onChange={(e) => updateNode(idx, { actionArg: e.target.value })}
                          placeholder={node.action === "tag" ? "nome-da-tag" : "stageId"}
                          className="text-xs flex-1 border border-slate-200 rounded px-2 py-1"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar flow"}
          </button>
        </div>
      </div>
    </div>
  );
}
