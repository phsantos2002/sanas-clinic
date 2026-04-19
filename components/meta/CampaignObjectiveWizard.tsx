"use client";

import { useState, useTransition } from "react";
import {
  MessageCircle,
  Globe,
  ShoppingBag,
  Instagram,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveCampaignObjective } from "@/app/actions/pixel";
import { toast } from "sonner";

type Props = {
  onComplete: () => void;
};

const DESTINATIONS = [
  {
    value: "WHATSAPP",
    label: "WhatsApp",
    desc: "Click-to-WhatsApp",
    icon: MessageCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  {
    value: "WEBSITE",
    label: "Website / Landing Page",
    desc: "Formulário ou checkout no site",
    icon: Globe,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  {
    value: "INSTAGRAM",
    label: "Instagram Direct",
    desc: "Mensagens pelo Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200",
  },
  {
    value: "FORM",
    label: "Formulário Nativo",
    desc: "Lead Ads do Facebook/Instagram",
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
  },
  {
    value: "STORE",
    label: "Loja / E-commerce",
    desc: "Vendas diretas no site",
    icon: ShoppingBag,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
];

const OBJECTIVES = [
  { value: "MESSAGES", label: "Mensagens", desc: "Maximizar conversas (WhatsApp, Messenger, IG)" },
  { value: "CONVERSIONS", label: "Conversões", desc: "Vendas, cadastros ou ações no site" },
  { value: "LEADS", label: "Geração de Leads", desc: "Capturar dados via formulário nativo" },
  { value: "ENGAGEMENT", label: "Engajamento", desc: "Curtidas, comentários e compartilhamentos" },
  { value: "TRAFFIC", label: "Tráfego", desc: "Visitas para o site ou landing page" },
];

export function CampaignObjectiveWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState<string | null>(null);
  const [objective, setObjective] = useState<string | null>(null);
  const [budget, setBudget] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleFinish() {
    if (!destination || !objective) return;
    startTransition(async () => {
      const result = await saveCampaignObjective({
        campaignObjective: objective,
        conversionDestination: destination,
        monthlyBudget: budget ? parseFloat(budget) : null,
      });
      if (result.success) {
        toast.success("Objetivo configurado com sucesso!");
        onComplete();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Configuração Inicial</h2>
            <p className="text-xs text-white/70">Responda 3 perguntas para otimizar sua análise</p>
          </div>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-white" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      <CardContent className="p-6">
        {/* Step 0: Destination */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Para onde seus anúncios levam os leads?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Escolha o destino principal das suas campanhas
              </p>
            </div>
            <div className="grid gap-2">
              {DESTINATIONS.map((d) => {
                const DIcon = d.icon;
                const selected = destination === d.value;
                return (
                  <button
                    key={d.value}
                    onClick={() => setDestination(d.value)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? `${d.bg} ring-2 ring-offset-1 ring-blue-400`
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${selected ? "" : "bg-slate-50"}`}
                    >
                      <DIcon className={`h-4 w-4 ${selected ? d.color : "text-slate-400"}`} />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${selected ? "text-slate-900" : "text-slate-700"}`}
                      >
                        {d.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{d.desc}</p>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => setStep(1)}
                disabled={!destination}
                className="rounded-xl gap-1.5"
              >
                Próximo <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Objective */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Qual o objetivo das suas campanhas?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Selecione o objetivo principal configurado na Meta
              </p>
            </div>
            <div className="grid gap-2">
              {OBJECTIVES.map((o) => {
                const selected = objective === o.value;
                return (
                  <button
                    key={o.value}
                    onClick={() => setObjective(o.value)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      selected
                        ? "bg-blue-50 border-blue-200 ring-2 ring-offset-1 ring-blue-400"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${selected ? "text-blue-900" : "text-slate-700"}`}
                      >
                        {o.label}
                      </p>
                      <p className="text-[11px] text-slate-400">{o.desc}</p>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(0)}
                className="rounded-xl gap-1.5"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!objective}
                className="rounded-xl gap-1.5"
              >
                Próximo <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Budget */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Qual sua verba mensal em anúncios?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Opcional — usaremos para alertas de orçamento
              </p>
            </div>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                R$
              </span>
              <Input
                type="number"
                placeholder="Ex: 3000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="pl-10 rounded-xl"
                min="0"
                step="100"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Você pode alterar depois em Configurações. Se não souber, deixe em branco.
            </p>
            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStep(1)}
                className="rounded-xl gap-1.5"
              >
                <ArrowLeft className="h-3 w-3" /> Voltar
              </Button>
              <Button
                size="sm"
                onClick={handleFinish}
                disabled={isPending || !destination || !objective}
                className="rounded-xl gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
              >
                {isPending ? "Salvando..." : "Concluir"}{" "}
                {!isPending && <Check className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
