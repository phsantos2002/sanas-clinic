"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, PenTool, BarChart3, Kanban, Heart } from "lucide-react";

type Automations = Record<string, boolean>;

const SECTIONS = [
  {
    title: "WhatsApp",
    icon: MessageCircle,
    toggles: [
      { key: "whatsappWelcome", label: "Resposta automatica de boas-vindas (< 1 min)" },
      { key: "followUp24h", label: "Follow-up apos 24h sem resposta" },
      { key: "confirmAgendamento", label: "Confirmacao de agendamento 48h antes" },
      { key: "reminderAgendamento", label: "Lembrete de agendamento 2h antes" },
      { key: "reactivation30d", label: "Reativacao de leads inativos (30 dias)" },
      { key: "nps7d", label: "NPS pos-procedimento (7 dias)" },
    ],
  },
  {
    title: "Conteudo",
    icon: PenTool,
    toggles: [
      { key: "weeklySuggestions", label: "Gerar sugestoes semanais com IA (segunda 8h)" },
      { key: "autoPublish", label: "Publicar posts agendados automaticamente" },
      { key: "collectMetrics", label: "Coletar metricas de posts a cada 6h" },
    ],
  },
  {
    title: "Engajamento",
    icon: Heart,
    toggles: [
      { key: "collectComments", label: "Coletar comentarios a cada 30 min" },
      { key: "aiReplies", label: "Gerar respostas sugeridas com IA" },
      { key: "autoLikeComments", label: "Curtir elogios automaticamente" },
      { key: "classifyFollowers", label: "Classificar novos seguidores como publico-alvo" },
    ],
  },
  {
    title: "Ads",
    icon: BarChart3,
    toggles: [
      { key: "cplAlert", label: "Alertar quando CPL subir mais de 30%" },
      { key: "frequencyAlert", label: "Alertar quando frequencia passar de 3" },
      { key: "capiEvents", label: "Disparar eventos CAPI em mudanca de stage" },
    ],
  },
  {
    title: "Pipeline",
    icon: Kanban,
    toggles: [
      { key: "dailyScoring", label: "Recalcular lead scoring diariamente" },
      { key: "stuckLeadAlert", label: "Alertar leads parados ha 5+ dias" },
    ],
  },
];

const DEFAULT_ON = [
  "whatsappWelcome", "followUp24h", "confirmAgendamento", "reactivation30d",
  "weeklySuggestions", "autoPublish", "collectMetrics",
  "collectComments", "aiReplies", "autoLikeComments", "classifyFollowers",
  "cplAlert", "frequencyAlert", "capiEvents", "dailyScoring", "stuckLeadAlert",
];

export function AutomationsForm({ initial, onSave }: {
  initial: Automations | null;
  onSave: (data: Automations) => Promise<{ success: boolean; error?: string }>;
}) {
  const [automations, setAutomations] = useState<Automations>(() => {
    if (initial && Object.keys(initial).length > 0) return initial;
    const defaults: Automations = {};
    for (const key of DEFAULT_ON) defaults[key] = true;
    return defaults;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setAutomations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(automations);
    setSaving(false);
    if (result.success) toast.success("Automacoes salvas!");
    else toast.error(result.error || "Erro ao salvar");
  };

  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-2">
            <section.icon className="h-4 w-4 text-slate-500" />
            <h4 className="text-sm font-semibold text-slate-700">{section.title}</h4>
          </div>
          <div className="space-y-1.5">
            {section.toggles.map((t) => (
              <label key={t.key} className="flex items-center justify-between py-1.5 cursor-pointer group">
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{t.label}</span>
                <button
                  type="button"
                  onClick={() => toggle(t.key)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${automations[t.key] ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${automations[t.key] ? "translate-x-5" : ""}`} />
                </button>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Automacoes"}
      </button>
    </div>
  );
}
