"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  PenTool,
  Zap,
  Clock,
  MessageCircle,
  Tag,
  Users,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  createWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  type WorkflowData,
  type TriggerConfig,
  type StepData,
} from "@/app/actions/workflows";
import type { Stage } from "@/types";

const TRIGGER_LABELS: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  new_lead: { label: "Novo Lead", icon: Users, color: "bg-blue-100 text-blue-700" },
  stage_change: {
    label: "Mudanca de Estagio",
    icon: ArrowRight,
    color: "bg-green-100 text-green-700",
  },
  inactivity: { label: "Inatividade", icon: Clock, color: "bg-amber-100 text-amber-700" },
  tag_added: { label: "Tag Adicionada", icon: Tag, color: "bg-violet-100 text-violet-700" },
  score_change: { label: "Score Mudou", icon: BarChart3, color: "bg-red-100 text-red-700" },
};

const ACTION_LABELS: Record<string, string> = {
  send_whatsapp: "Enviar WhatsApp",
  move_stage: "Mover Estagio",
  add_tag: "Adicionar Tag",
  remove_tag: "Remover Tag",
  assign_attendant: "Atribuir Atendente",
  update_score: "Alterar Score",
  notify: "Notificar",
};

export function WorkflowsClient({
  workflows,
  stages,
}: {
  workflows: WorkflowData[];
  stages: Stage[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<string>("new_lead");
  const [triggerStageId, setTriggerStageId] = useState("");
  const [triggerDays, setTriggerDays] = useState(7);
  const [triggerTag, setTriggerTag] = useState("");
  const [actionType, setActionType] = useState("send_whatsapp");
  const [actionMessage, setActionMessage] = useState("");
  const [actionStageId, setActionStageId] = useState("");
  const [actionTag, setActionTag] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);

    const trigger: TriggerConfig = { type: triggerType as TriggerConfig["type"], config: {} };
    if (triggerType === "stage_change") trigger.config = { stageId: triggerStageId };
    if (triggerType === "inactivity") trigger.config = { days: triggerDays };
    if (triggerType === "tag_added") trigger.config = { tag: triggerTag };

    const step: StepData = { order: 0, type: "action", config: { actionType } };
    if (actionType === "send_whatsapp") step.config.message = actionMessage || "Ola {{nome}}!";
    if (actionType === "move_stage") step.config.stageId = actionStageId;
    if (actionType === "add_tag" || actionType === "remove_tag") step.config.tag = actionTag;
    if (actionType === "assign_attendant") step.config.attendantId = "auto";

    const result = await createWorkflow({ name: name.trim(), trigger, steps: [step] });
    setCreating(false);

    if (result.success) {
      toast.success("Automacao criada!");
      setShowCreate(false);
      setName("");
      router.refresh();
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  const handleToggle = async (id: string) => {
    await toggleWorkflow(id);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteWorkflow(id);
    toast.success("Automacao excluida");
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Automacoes</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Workflows automaticos: trigger → condicao → acao
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Nova Automacao
        </button>
      </div>

      {/* Workflow List */}
      {workflows.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <Workflow className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">Nenhuma automacao</h3>
          <p className="text-sm text-slate-400">
            Crie sua primeira automacao para automatizar tarefas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const trigger = TRIGGER_LABELS[wf.trigger.type] || TRIGGER_LABELS.new_lead;
            const TriggerIcon = trigger.icon;
            return (
              <div key={wf.id} className="bg-white border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${trigger.color}`}
                    >
                      <TriggerIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{wf.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${trigger.color}`}
                        >
                          {trigger.label}
                        </span>
                        <ChevronRight className="h-3 w-3 text-slate-300" />
                        {wf.steps.map((step, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
                          >
                            {ACTION_LABELS[step.config.actionType as string] || step.type}
                          </span>
                        ))}
                        <span className="text-[10px] text-slate-400">
                          {wf.executionCount} execucoes
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/workflows/${wf.id}`}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      title="Editar no canvas"
                    >
                      <PenTool className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleToggle(wf.id)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                        wf.isActive
                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                          : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                      title={wf.isActive ? "Pausar" : "Ativar"}
                    >
                      {wf.isActive ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Nova Automacao</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Reativar leads inativos"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Trigger */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Quando (trigger)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TRIGGER_LABELS).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setTriggerType(key)}
                        className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium transition-all ${
                          triggerType === key
                            ? `${cfg.color} border-2 border-current`
                            : "bg-slate-50 text-slate-500 border-2 border-transparent"
                        }`}
                      >
                        <Icon className="h-4 w-4" /> {cfg.label}
                      </button>
                    );
                  })}
                </div>
                {triggerType === "stage_change" && (
                  <select
                    value={triggerStageId}
                    onChange={(e) => setTriggerStageId(e.target.value)}
                    className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Qualquer estagio</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                {triggerType === "inactivity" && (
                  <input
                    type="number"
                    value={triggerDays}
                    onChange={(e) => setTriggerDays(Number(e.target.value))}
                    className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Dias de inatividade"
                  />
                )}
                {triggerType === "tag_added" && (
                  <input
                    type="text"
                    value={triggerTag}
                    onChange={(e) => setTriggerTag(e.target.value)}
                    className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Nome da tag"
                  />
                )}
              </div>

              {/* Action */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Entao (acao)
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  {Object.entries(ACTION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                {actionType === "send_whatsapp" && (
                  <textarea
                    value={actionMessage}
                    onChange={(e) => setActionMessage(e.target.value)}
                    placeholder="Ola {{nome}}! Tudo bem? - {{clinica}}"
                    rows={3}
                    className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none"
                  />
                )}
                {actionType === "move_stage" && (
                  <select
                    value={actionStageId}
                    onChange={(e) => setActionStageId(e.target.value)}
                    className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Selecione estagio</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                {(actionType === "add_tag" || actionType === "remove_tag") && (
                  <input
                    type="text"
                    value={actionTag}
                    onChange={(e) => setActionTag(e.target.value)}
                    className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Nome da tag"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? "Criando..." : "Criar Automacao"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
