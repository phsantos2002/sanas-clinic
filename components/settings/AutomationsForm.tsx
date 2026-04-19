"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, BarChart3, Kanban } from "lucide-react";

type Automations = Record<string, boolean>;

const SECTIONS = [
  {
    title: "Atendimento WhatsApp",
    icon: MessageCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "Respostas e follow-ups automaticos para nao perder leads",
    toggles: [
      {
        key: "whatsappWelcome",
        label: "Boas-vindas automaticas",
        desc: "Responde em menos de 1 min quando um lead envia mensagem",
      },
      {
        key: "followUp24h",
        label: "Follow-up 24h",
        desc: "Envia lembrete se o lead nao respondeu em 24 horas",
      },
      {
        key: "confirmAgendamento",
        label: "Confirmar agendamento",
        desc: "Pergunta se o cliente confirma 48h antes",
      },
      {
        key: "reminderAgendamento",
        label: "Lembrete 2h antes",
        desc: "Envia lembrete no dia do agendamento",
      },
      {
        key: "reactivation30d",
        label: "Reativar inativos",
        desc: "Tenta reconectar leads sem interacao ha 30 dias",
      },
      { key: "nps7d", label: "Pesquisa NPS", desc: "Pede avaliacao 7 dias apos o atendimento" },
    ],
  },
  {
    title: "Ads & Conversao",
    icon: BarChart3,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Alertas e eventos do Meta Ads para otimizar campanhas",
    toggles: [
      {
        key: "cplAlert",
        label: "Alerta de CPL alto",
        desc: "Notifica quando o custo por lead subir mais de 30%",
      },
      {
        key: "frequencyAlert",
        label: "Alerta de frequencia",
        desc: "Avisa quando a frequencia do anuncio passar de 3",
      },
      {
        key: "capiEvents",
        label: "Eventos CAPI automaticos",
        desc: "Dispara eventos de conversao ao mudar lead de etapa",
      },
    ],
  },
  {
    title: "Pipeline & Leads",
    icon: Kanban,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Gestao automatica do funil de vendas",
    toggles: [
      {
        key: "dailyScoring",
        label: "Lead scoring diario",
        desc: "Recalcula a pontuacao de todos os leads diariamente",
      },
      {
        key: "stuckLeadAlert",
        label: "Alerta de leads parados",
        desc: "Notifica leads sem movimentacao ha 5+ dias",
      },
    ],
  },
];

const DEFAULT_ON = [
  "whatsappWelcome",
  "followUp24h",
  "confirmAgendamento",
  "reactivation30d",
  "cplAlert",
  "frequencyAlert",
  "capiEvents",
  "dailyScoring",
  "stuckLeadAlert",
];

export function AutomationsForm({
  initial,
  onSave,
}: {
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

  // Count active automations per section
  const getSectionActiveCount = (section: (typeof SECTIONS)[0]) => {
    return section.toggles.filter((t) => automations[t.key]).length;
  };

  return (
    <div className="space-y-6">
      {SECTIONS.map((section) => {
        const activeCount = getSectionActiveCount(section);
        const totalCount = section.toggles.length;

        return (
          <div key={section.title} className="border border-slate-100 rounded-xl overflow-hidden">
            {/* Section Header */}
            <div className={`flex items-center gap-3 px-4 py-3 ${section.bgColor}`}>
              <section.icon className={`h-4.5 w-4.5 ${section.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      activeCount === totalCount
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {activeCount}/{totalCount}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
              </div>
            </div>

            {/* Toggles */}
            <div className="divide-y divide-slate-50">
              {section.toggles.map((t) => (
                <label
                  key={t.key}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer group hover:bg-slate-25 transition-colors"
                >
                  <div className="flex-1 min-w-0 pt-0.5">
                    <span className="text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors block">
                      {t.label}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">{t.desc}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(t.key)}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-1 ${automations[t.key] ? "bg-indigo-600" : "bg-slate-200"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${automations[t.key] ? "translate-x-5" : ""}`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        );
      })}

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
