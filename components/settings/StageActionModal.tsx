"use client";

import { useState } from "react";
import { X, MessageCircle, Tag, UserPlus, Bell, Zap } from "lucide-react";
import { toast } from "sonner";
import { createWorkflow } from "@/app/actions/workflows";
import type { Stage } from "@/types";
import type { AttendantData } from "@/app/actions/whatsappHub";

type ActionType = "send_whatsapp" | "add_tag" | "assign_attendant" | "notify";

type Props = {
  stage: Stage;
  attendants: AttendantData[];
  onClose: () => void;
  onCreated: () => void;
};

const ACTION_OPTIONS: {
  id: ActionType;
  label: string;
  description: string;
  icon: typeof MessageCircle;
  color: string;
}[] = [
  {
    id: "send_whatsapp",
    label: "Enviar WhatsApp",
    description: "Dispara uma mensagem automática ao lead",
    icon: MessageCircle,
    color: "text-green-600 bg-green-50",
  },
  {
    id: "add_tag",
    label: "Adicionar tag",
    description: "Aplica uma tag para filtrar/segmentar",
    icon: Tag,
    color: "text-violet-600 bg-violet-50",
  },
  {
    id: "assign_attendant",
    label: "Atribuir atendente",
    description: "Responsável fixo ou round-robin",
    icon: UserPlus,
    color: "text-blue-600 bg-blue-50",
  },
  {
    id: "notify",
    label: "Notificar equipe",
    description: "Cria notificação interna para o time",
    icon: Bell,
    color: "text-amber-600 bg-amber-50",
  },
];

export function StageActionModal({ stage, attendants, onClose, onCreated }: Props) {
  const [actionType, setActionType] = useState<ActionType>("send_whatsapp");
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");
  const [attendantId, setAttendantId] = useState<string>("auto");
  const [notifyText, setNotifyText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    let stepConfig: Record<string, unknown> = {};
    let name = "";

    if (actionType === "send_whatsapp") {
      if (!message.trim()) {
        toast.error("Mensagem obrigatória");
        return;
      }
      stepConfig = { message: message.trim() };
      name = `Enviar WhatsApp ao entrar em "${stage.name}"`;
    } else if (actionType === "add_tag") {
      if (!tag.trim()) {
        toast.error("Tag obrigatória");
        return;
      }
      stepConfig = { tag: tag.trim() };
      name = `Adicionar tag "${tag.trim()}" ao entrar em "${stage.name}"`;
    } else if (actionType === "assign_attendant") {
      stepConfig = { attendantId };
      const label =
        attendantId === "auto"
          ? "round-robin"
          : (attendants.find((a) => a.id === attendantId)?.name ?? "atendente");
      name = `Atribuir a ${label} ao entrar em "${stage.name}"`;
    } else {
      if (!notifyText.trim()) {
        toast.error("Texto da notificação obrigatório");
        return;
      }
      stepConfig = { message: notifyText.trim() };
      name = `Notificar "${notifyText.trim()}" ao entrar em "${stage.name}"`;
    }

    setSaving(true);
    const result = await createWorkflow({
      name,
      description: `Ação automática disparada quando um lead entra em ${stage.name}`,
      trigger: {
        type: "stage_change",
        config: { stageId: stage.id },
      },
      steps: [
        {
          order: 0,
          type: "action",
          config: { action: actionType, ...stepConfig },
        },
      ],
    });
    setSaving(false);

    if (result.success) {
      toast.success("Ação configurada");
      onCreated();
    } else {
      toast.error(result.error ?? "Erro ao criar ação");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> Ação automática
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Quando um lead entrar em <span className="font-medium">{stage.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Tipo de ação</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActionType(opt.id)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                    actionType === opt.id
                      ? "border-indigo-200 bg-indigo-50/50"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${opt.color}`}
                  >
                    <opt.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900">{opt.label}</p>
                  <p className="text-[11px] text-slate-500">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {actionType === "send_whatsapp" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Ola {{nome}}, recebemos seu interesse..."
                rows={4}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Use {"{{nome}}"} para inserir o nome do lead.
              </p>
            </div>
          )}

          {actionType === "add_tag" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Tag</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex: vip, quente, follow-up"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {actionType === "assign_attendant" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Atendente</label>
              <select
                value={attendantId}
                onChange={(e) => setAttendantId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="auto">Round-robin (automatico)</option>
                {attendants
                  .filter((a) => a.isActive)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {actionType === "notify" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Texto da notificação
              </label>
              <input
                type="text"
                value={notifyText}
                onChange={(e) => setNotifyText(e.target.value)}
                placeholder="Ex: Novo cliente fechado!"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Criar ação"}
          </button>
        </div>
      </div>
    </div>
  );
}
