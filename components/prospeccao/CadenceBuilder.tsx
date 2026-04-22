"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Mail, Clock, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import { toast } from "sonner";
import { createCadence, updateCadence, type CadenceStepData } from "@/app/actions/cadences";

type Props = {
  initial?: {
    id: string;
    name: string;
    description: string | null;
    stopOnReply: boolean;
    isActive: boolean;
    steps: CadenceStepData[];
  };
};

const STEP_LABELS: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  send_whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-green-600 bg-green-50" },
  send_email: { icon: Mail, label: "Email", color: "text-blue-600 bg-blue-50" },
  delay: { icon: Clock, label: "Esperar", color: "text-amber-600 bg-amber-50" },
};

const DEFAULT_STEPS: CadenceStepData[] = [
  {
    order: 0,
    type: "send_whatsapp",
    message:
      "Oi {{nome}}! Vi o seu perfil{{empresa}} e tenho uma ideia rápida que pode te interessar. Posso mandar em 2 linhas?",
  },
  { order: 1, type: "delay", delayDays: 2, delayHours: 0 },
  {
    order: 2,
    type: "send_whatsapp",
    message:
      "{{nome}}, só complementando — nosso sistema já ajudou negócios parecidos com o seu a triplicar o retorno das campanhas. Quer ver um caso rápido?",
  },
  { order: 3, type: "delay", delayDays: 4, delayHours: 0 },
  {
    order: 4,
    type: "send_whatsapp",
    message: "{{nome}}, vou parar por aqui. Se quiser conversar algum dia, é só me chamar. Abs!",
  },
];

export function CadenceBuilder({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [stopOnReply, setStopOnReply] = useState(initial?.stopOnReply ?? true);
  const [steps, setSteps] = useState<CadenceStepData[]>(
    initial?.steps && initial.steps.length > 0 ? initial.steps : DEFAULT_STEPS
  );
  const [saving, setSaving] = useState(false);

  const addStep = (type: CadenceStepData["type"]) => {
    const newStep: CadenceStepData = {
      order: steps.length,
      type,
      ...(type === "delay"
        ? { delayDays: 1, delayHours: 0 }
        : type === "send_email"
          ? { subject: "", message: "" }
          : { message: "" }),
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (idx: number, patch: Partial<CadenceStepData>) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const moveStep = (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSteps(next.map((s, i) => ({ ...s, order: i })));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("De um nome para a cadencia");
      return;
    }
    if (steps.length === 0) {
      toast.error("Adicione pelo menos um passo");
      return;
    }
    setSaving(true);
    const payload = { name: name.trim(), description, stopOnReply, steps };
    const result = initial
      ? await updateCadence(initial.id, payload)
      : await createCadence(payload);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(initial ? "Cadencia atualizada" : "Cadencia criada");
    router.push("/dashboard/settings/tools");
    router.refresh();
  };

  // Calculate timeline preview
  let totalDays = 0;
  let totalHours = 0;
  for (const s of steps) {
    if (s.type === "delay") {
      totalDays += s.delayDays ?? 0;
      totalHours += s.delayHours ?? 0;
    }
  }
  totalDays += Math.floor(totalHours / 24);
  totalHours = totalHours % 24;

  return (
    <div className="max-w-3xl space-y-4">
      {/* Meta */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-700 mb-1 block">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Cadência outbound — SDR B2B"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-700 mb-1 block">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="O que esta cadencia faz, para quem"
            rows={2}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={stopOnReply}
            onChange={(e) => setStopOnReply(e.target.checked)}
            className="rounded"
          />
          Parar quando o lead responder
        </label>
      </div>

      {/* Timeline summary */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>
          <strong>{steps.length} passos</strong> ao longo de {totalDays} dia
          {totalDays !== 1 ? "s" : ""}
          {totalHours > 0 && ` e ${totalHours}h`}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => {
          const meta = STEP_LABELS[step.type];
          const Icon = meta.icon;
          return (
            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${meta.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(idx, "up")}
                        disabled={idx === 0}
                        className="h-6 w-6 rounded hover:bg-slate-100 disabled:opacity-20"
                      >
                        <ArrowUp className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        onClick={() => moveStep(idx, "down")}
                        disabled={idx === steps.length - 1}
                        className="h-6 w-6 rounded hover:bg-slate-100 disabled:opacity-20"
                      >
                        <ArrowDown className="h-3 w-3 mx-auto" />
                      </button>
                      <button
                        onClick={() => removeStep(idx)}
                        className="h-6 w-6 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3 mx-auto" />
                      </button>
                    </div>
                  </div>

                  {step.type === "send_whatsapp" && (
                    <textarea
                      value={step.message ?? ""}
                      onChange={(e) => updateStep(idx, { message: e.target.value })}
                      placeholder="Mensagem (use {{nome}}, {{empresa}}, {{clinica}})"
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  )}

                  {step.type === "send_email" && (
                    <>
                      <input
                        type="text"
                        value={step.subject ?? ""}
                        onChange={(e) => updateStep(idx, { subject: e.target.value })}
                        placeholder="Assunto"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <textarea
                        value={step.message ?? ""}
                        onChange={(e) => updateStep(idx, { message: e.target.value })}
                        placeholder="Corpo do email (use {{nome}}, {{empresa}})"
                        rows={4}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </>
                  )}

                  {step.type === "delay" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={step.delayDays ?? 0}
                        onChange={(e) => updateStep(idx, { delayDays: Number(e.target.value) })}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-500">dias</span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={step.delayHours ?? 0}
                        onChange={(e) => updateStep(idx, { delayHours: Number(e.target.value) })}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-500">horas</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add step toolbar */}
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-3 flex items-center justify-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Adicionar passo:</span>
        <button
          onClick={() => addStep("send_whatsapp")}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100"
        >
          <Plus className="h-3 w-3" /> WhatsApp
        </button>
        <button
          onClick={() => addStep("send_email")}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100"
        >
          <Plus className="h-3 w-3" /> Email
        </button>
        <button
          onClick={() => addStep("delay")}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100"
        >
          <Plus className="h-3 w-3" /> Espera
        </button>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || steps.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : initial ? "Salvar alterações" : "Criar cadência"}
        </button>
      </div>
    </div>
  );
}
