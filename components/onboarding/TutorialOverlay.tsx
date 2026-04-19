"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  BarChart3,
  Zap,
  Briefcase,
  Brain,
  Kanban,
  CalendarDays,
  Megaphone,
  Sparkles,
} from "lucide-react";

import { markTutorialSeen } from "@/app/actions/tutorial";

const STEPS = [
  {
    icon: Sparkles,
    color: "from-indigo-500 to-violet-600",
    title: "Bem-vindo ao Sanas Pulse!",
    subtitle: "Seu CRM com IA para WhatsApp",
    desc: "Vou te mostrar as principais funcoes em 2 minutos. Voce pode pular a qualquer momento.",
    action: null,
  },
  {
    icon: BarChart3,
    color: "from-blue-500 to-cyan-500",
    title: "Dashboard",
    subtitle: "Visao geral do seu negocio",
    desc: "Aqui voce ve todos os leads novos, leads quentes, vendas, postagens e agendamentos em um so lugar. Priorize os leads mais importantes.",
    action: "/dashboard/overview",
  },
  {
    icon: MessageCircle,
    color: "from-green-500 to-emerald-500",
    title: "Chat WhatsApp",
    subtitle: "Atendimento centralizado",
    desc: "Todas as conversas do WhatsApp aqui. A IA responde automaticamente 24/7, mesmo com o sistema fechado. Voce pode intervir a qualquer momento.",
    action: "/dashboard/chat",
  },
  {
    icon: Kanban,
    color: "from-purple-500 to-pink-500",
    title: "Pipeline",
    subtitle: "Funil de vendas visual",
    desc: "Veja seus leads em cada etapa: Novo Lead, Atendido, Qualificado, Agendado, Cliente. A IA move os leads automaticamente conforme a conversa.",
    action: "/dashboard/pipeline",
  },
  {
    icon: Megaphone,
    color: "from-blue-500 to-indigo-500",
    title: "Ads (Meta)",
    subtitle: "Acompanhe suas campanhas",
    desc: "Integracao com Meta Ads e Facebook Pixel. Veja CPL, frequencia e performance das campanhas em tempo real. Gratuito via API oficial.",
    action: "/dashboard/meta",
  },
  {
    icon: CalendarDays,
    color: "from-violet-500 to-purple-500",
    title: "Postagens",
    subtitle: "Agende posts automaticos",
    desc: "Agende posts para Instagram, Facebook e YouTube. A IA gera legendas, hashtags e sugere horarios ideais.",
    action: "/dashboard/posts",
  },
  {
    icon: Briefcase,
    color: "from-teal-500 to-cyan-500",
    title: "Servicos & Agenda",
    subtitle: "Cadastre servicos + Google Calendar",
    desc: "Cadastre servicos (nome, valor, duracao). Conecte o Google Calendar e a IA agenda automaticamente via WhatsApp.",
    action: "/dashboard/settings/services",
  },
  {
    icon: Brain,
    color: "from-indigo-500 to-purple-500",
    title: "IA Chat",
    subtitle: "Configure a IA",
    desc: "Ajuste como a IA responde: delays humanizados, filtros de numero, follow-up automatico, audio com voz natural, intervencao humana.",
    action: "/dashboard/settings/ai",
  },
  {
    icon: Zap,
    color: "from-amber-500 to-orange-500",
    title: "Automacoes",
    subtitle: "Fluxos automaticos",
    desc: "16 automacoes prontas: boas-vindas, follow-up 24h, confirmar agendamento, reativar inativos, alertas de CPL, NPS pos-venda e mais.",
    action: "/dashboard/settings/automations",
  },
  {
    icon: Sparkles,
    color: "from-green-500 to-emerald-500",
    title: "Tudo pronto!",
    subtitle: "Comece agora",
    desc: "Conecte seu WhatsApp em Integracoes, configure sua IA em IA Chat, cadastre seus servicos e deixe a IA trabalhar por voce.",
    action: "/dashboard/overview",
  },
];

export function TutorialOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [animate, setAnimate] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, [step]);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleSkip = async () => {
    await markTutorialSeen();
    onClose();
  };

  const handleFinish = async () => {
    await markTutorialSeen();
    onClose();
    if (current.action) router.push(current.action);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-500 ${animate ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header with close */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {step + 1} de {STEPS.length}
            </span>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-4 rounded-full transition-colors ${i <= step ? "bg-indigo-600" : "bg-slate-200"}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
          >
            Pular <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div
              className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${current.color} flex items-center justify-center mb-6 shadow-lg`}
            >
              <Icon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{current.title}</h2>
            <p className="text-sm font-medium text-indigo-600 mb-4">{current.subtitle}</p>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">{current.desc}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          {!isLast ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Comecar <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
