"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, Check, Zap, Brain, BarChart3, MessageCircle,
  Megaphone, CalendarDays, LineChart, MessagesSquare, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { saveOnboardingData } from "@/app/actions/onboarding";

const NICHES = [
  { id: "clinica_estetica", label: "Clinica de Estetica", emoji: "💉" },
  { id: "clinica_odontologica", label: "Clinica Odontologica", emoji: "🦷" },
  { id: "salao_beleza", label: "Salao de Beleza", emoji: "💇" },
  { id: "barbearia", label: "Barbearia", emoji: "✂️" },
  { id: "academia", label: "Academia / Personal", emoji: "💪" },
  { id: "restaurante", label: "Restaurante / Food", emoji: "🍽️" },
  { id: "saude", label: "Saude / Consultorio", emoji: "🏥" },
  { id: "educacao", label: "Educacao / Cursos", emoji: "📚" },
  { id: "imobiliaria", label: "Imobiliaria", emoji: "🏠" },
  { id: "ecommerce", label: "E-commerce / Loja Online", emoji: "🛒" },
  { id: "loja_roupas", label: "Loja de Roupas / Moda", emoji: "👗" },
  { id: "advocacia", label: "Advocacia / Juridico", emoji: "⚖️" },
  { id: "contabilidade", label: "Contabilidade / Financeiro", emoji: "📊" },
  { id: "arquitetura", label: "Arquitetura / Engenharia", emoji: "📐" },
  { id: "pet", label: "Pet Shop / Veterinario", emoji: "🐾" },
  { id: "tecnologia", label: "Tecnologia / SaaS", emoji: "💻" },
  { id: "marketing", label: "Agencia de Marketing", emoji: "📣" },
  { id: "servicos", label: "Servicos em Geral", emoji: "🔧" },
  { id: "outro", label: "Outro", emoji: "📌" },
];

const TONES = [
  { id: "profissional", label: "Profissional e confiavel", desc: "Tom corporativo e serio" },
  { id: "acolhedor", label: "Acolhedor e humano", desc: "Empatico e proximo do cliente" },
  { id: "descontraido", label: "Descontraido e divertido", desc: "Leve, com humor e informalidade" },
  { id: "luxo", label: "Sofisticado e premium", desc: "Elegante, exclusivo e refinado" },
  { id: "jovem", label: "Jovem e dinamico", desc: "Energetico e moderno" },
];

const FEATURES_TOUR = [
  {
    icon: Megaphone,
    title: "Ads & Pixel",
    subtitle: "Gratis via API do Facebook",
    desc: "Acompanhe suas campanhas do Meta Ads, monitore CPL, frequencia e dispare eventos de conversao automaticamente pelo Pixel.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: LineChart,
    title: "Analytics",
    subtitle: "Metricas em tempo real",
    desc: "Dashboard com dados de engajamento, alcance e desempenho dos seus posts e campanhas — tudo integrado com a API do Facebook.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: CalendarDays,
    title: "Agendar Posts",
    subtitle: "Publicacao automatica",
    desc: "Crie e agende posts para Instagram, Facebook e Google Meu Negocio. A IA gera legendas, hashtags e sugere horarios.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: MessagesSquare,
    title: "Chat WhatsApp",
    subtitle: "Atendimento centralizado",
    desc: "Converse com clientes direto pelo Sanas Pulse. Respostas automaticas, follow-up inteligente e IA que sugere respostas.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [animate, setAnimate] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [services, setServices] = useState("");
  const [avgTicket, setAvgTicket] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("profissional");
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  // Trigger entrance animation on step change
  useEffect(() => {
    setAnimate(false);
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, [step]);

  const handleFinish = async () => {
    setSaving(true);
    const result = await saveOnboardingData({
      businessName, niche, city, services, avgTicket, targetAudience, tone,
    });
    setSaving(false);

    if (result.success) {
      toast.success("Tudo configurado! Bem-vindo ao Sanas Pulse");
      router.push("/dashboard/overview");
    } else {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  };

  const canAdvance = step === 0 ? businessName.trim().length > 0 : step === 1 ? niche.length > 0 : true;
  const totalSteps = 5;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s <= step ? "bg-indigo-600" : "bg-slate-200"}`} />
          ))}
        </div>

        {/* Step 0: Name */}
        {step === 0 && (
          <div className={`space-y-8 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="text-center">
              <div className="relative h-20 w-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl rotate-6 opacity-20" />
                <div className="relative h-20 w-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <Sparkles className="h-9 w-9 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Bem-vindo ao Sanas Pulse
              </h1>
              <p className="text-base text-slate-500 mt-2">
                Seu CRM com IA pronto em <span className="font-semibold text-indigo-600">2 minutos</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Qual o nome do seu negocio?</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && businessName.trim() && setStep(1)}
                placeholder="Ex: Consultório Silva, Loja Moderna, Software XYZ..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-base bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: Brain, label: "IA que vende por voce", color: "text-violet-500" },
                { icon: MessageCircle, label: "WhatsApp integrado", color: "text-green-500" },
                { icon: BarChart3, label: "Pipeline inteligente", color: "text-blue-500" },
                { icon: Zap, label: "Automacoes prontas", color: "text-amber-500" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50/80">
                  <item.icon className={`h-4 w-4 ${item.color} shrink-0`} />
                  <span className="text-xs text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Niche */}
        {step === 1 && (
          <div className={`space-y-6 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Qual o nicho de {businessName}?</h2>
              <p className="text-sm text-slate-400 mt-1">A IA personaliza conteudo, tom e automacoes pro seu segmento</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
              {NICHES.map((n) => (
                <button key={n.id} onClick={() => setNiche(n.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm text-left transition-all ${
                    niche === n.id ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400" : "bg-white border border-slate-100 text-slate-700 hover:bg-slate-50"
                  }`}>
                  <span className="text-lg">{n.emoji}</span> {n.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Features Tour */}
        {step === 2 && (
          <div className={`space-y-6 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">O que voce pode fazer gratis</h2>
              <p className="text-sm text-slate-400 mt-1">Todas estas funcoes usam a API oficial do Facebook — sem custo extra</p>
            </div>
            <div className="space-y-3">
              {FEATURES_TOUR.map((feature, i) => (
                <button
                  key={feature.title}
                  onClick={() => setExpandedFeature(expandedFeature === i ? null : i)}
                  className={`w-full text-left rounded-xl border transition-all ${
                    expandedFeature === i ? "border-indigo-200 bg-white shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3 p-4">
                    <div className={`h-10 w-10 ${feature.bg} rounded-xl flex items-center justify-center shrink-0`}>
                      <feature.icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                      <p className="text-xs text-slate-400">{feature.subtitle}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-slate-300 transition-transform ${expandedFeature === i ? "rotate-90" : ""}`} />
                  </div>
                  {expandedFeature === i && (
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className={`space-y-4 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Detalhes de {businessName}</h2>
              <p className="text-sm text-slate-400 mt-1">Opcional — pode preencher depois em Config</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Cidade</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Sao Paulo - SP"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Servicos oferecidos</label>
              <textarea value={services} onChange={(e) => setServices(e.target.value)} rows={2}
                placeholder="Ex: Botox, Harmonizacao, Limpeza de Pele..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Ticket medio (R$)</label>
                <input type="text" value={avgTicket} onChange={(e) => setAvgTicket(e.target.value)} placeholder="500"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Publico-alvo</label>
                <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Mulheres 25-45"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Tone + Finish */}
        {step === 4 && (
          <div className={`space-y-6 transition-all duration-500 ${animate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Ultimo passo!</h2>
              <p className="text-sm text-slate-400 mt-1">Como a IA de {businessName} deve se comunicar?</p>
            </div>
            <div className="space-y-2">
              {TONES.map((t) => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${
                    tone === t.id ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400" : "bg-white border border-slate-100 text-slate-700 hover:bg-slate-50"
                  }`}>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${tone === t.id ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                    {tone === t.id && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className={`text-xs mt-0.5 ${tone === t.id ? "text-indigo-500" : "text-slate-400"}`}>{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-green-50 border border-green-100 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-green-800 text-sm">O que vou configurar pra voce:</h3>
              <div className="space-y-1 text-xs text-green-700">
                <p>✅ Pipeline com 5 etapas do funil</p>
                <p>✅ IA personalizada para {NICHES.find((n) => n.id === niche)?.label || "seu nicho"}</p>
                <p>✅ Tom de voz: {TONES.find((t) => t.id === tone)?.label}</p>
                <p>✅ Dashboard com alertas inteligentes</p>
                <p>✅ Assistente IA pronto para usar</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">
              Voltar
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canAdvance}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? "Configurando..." : "Comecar a usar"} <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
