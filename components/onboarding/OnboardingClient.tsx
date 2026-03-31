"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Check } from "lucide-react";
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
  { id: "ecommerce", label: "E-commerce", emoji: "🛒" },
  { id: "servicos", label: "Servicos em Geral", emoji: "🔧" },
  { id: "outro", label: "Outro", emoji: "📌" },
];

const TONES = [
  { id: "profissional", label: "Profissional e confiavel" },
  { id: "acolhedor", label: "Acolhedor e humano" },
  { id: "descontraido", label: "Descontraido e divertido" },
  { id: "luxo", label: "Sofisticado e premium" },
  { id: "jovem", label: "Jovem e dinamico" },
];

export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [services, setServices] = useState("");
  const [avgTicket, setAvgTicket] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [tone, setTone] = useState("profissional");

  const handleFinish = async () => {
    setSaving(true);
    const result = await saveOnboardingData({
      businessName, niche, city, services, avgTicket, targetAudience, tone,
    });
    setSaving(false);

    if (result.success) {
      toast.success("Tudo configurado! Bem-vindo ao LuxCRM");
      router.push("/dashboard/overview");
    } else {
      toast.error("Erro ao salvar. Tente novamente.");
    }
  };

  const canAdvance = step === 0 ? businessName.trim().length > 0 : step === 1 ? niche.length > 0 : true;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-indigo-600" : "bg-slate-200"}`} />
          ))}
        </div>

        {/* Step 0: Name */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Bem-vindo ao LuxCRM</h1>
              <p className="text-sm text-slate-400 mt-2">Vou configurar tudo pra voce em 2 minutos</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Qual o nome do seu negocio?</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ex: Clinica Renova, Barbearia do Joao..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus />
            </div>
          </div>
        )}

        {/* Step 1: Niche */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Qual o seu nicho?</h2>
              <p className="text-sm text-slate-400 mt-1">Isso ajuda a IA a personalizar todo o conteudo</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
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

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Detalhes do {businessName}</h2>
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

        {/* Step 3: Tone + Finish */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Ultimo passo!</h2>
              <p className="text-sm text-slate-400 mt-1">Como a IA deve se comunicar?</p>
            </div>
            <div className="space-y-2">
              {TONES.map((t) => (
                <button key={t.id} onClick={() => setTone(t.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm text-left transition-all ${
                    tone === t.id ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400" : "bg-white border border-slate-100 text-slate-700 hover:bg-slate-50"
                  }`}>
                  <div className={`h-4 w-4 rounded-full border-2 ${tone === t.id ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                    {tone === t.id && <Check className="h-3 w-3 text-white" />}
                  </div>
                  {t.label}
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
          {step < 3 ? (
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
