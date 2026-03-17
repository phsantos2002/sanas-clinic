"use client";

import { useState, useTransition } from "react";
import { BookOpen, Zap, TrendingUp, Crown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { diagnoseAccountPhase, saveAccountPhase, type AccountPhaseResult } from "@/app/actions/accountPhase";

type Phase = "LEARNING" | "STABILIZING" | "SCALING" | "MATURE";

const PHASE_CONFIG: Record<Phase, { label: string; color: string; bg: string; border: string; icon: typeof BookOpen }> = {
  LEARNING:    { label: "Aprendizado",    color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200", icon: BookOpen },
  STABILIZING: { label: "Estabilização",  color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200", icon: Zap },
  SCALING:     { label: "Escala",         color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: TrendingUp },
  MATURE:      { label: "Maturidade",     color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200", icon: Crown },
};

const BID_LABELS: Record<string, string> = {
  LOWEST_COST: "Menor Custo",
  COST_CAP: "Cost Cap",
  BID_CAP: "Bid Cap",
  ROAS_MIN: "ROAS Mínimo",
};

type Props = {
  userId: string;
  initialPhase: Phase | null;
  initialBidStrategy: string | null;
  conversionDestination: string | null;
};

export function AccountPhaseCard({ userId, initialPhase, initialBidStrategy, conversionDestination }: Props) {
  const [result, setResult] = useState<AccountPhaseResult | null>(
    initialPhase ? {
      phase: initialPhase,
      reason: "",
      recommendation: "",
      suggestedBidStrategy: (initialBidStrategy as AccountPhaseResult["suggestedBidStrategy"]) ?? "LOWEST_COST",
      suggestedEvent: "",
    } : null
  );
  const [isPending, startTransition] = useTransition();

  function handleDiagnose() {
    startTransition(async () => {
      try {
        const diagnosis = await diagnoseAccountPhase(userId, conversionDestination);
        setResult(diagnosis);
        await saveAccountPhase(userId, diagnosis.phase, diagnosis.suggestedBidStrategy);
        toast.success("Diagnóstico atualizado");
      } catch {
        toast.error("Erro ao diagnosticar conta");
      }
    });
  }

  if (!result) {
    return (
      <Card className="border-slate-200 rounded-2xl shadow-sm">
        <CardContent className="py-6 text-center space-y-3">
          <p className="text-sm text-slate-500">Diagnóstico de fase da conta não realizado</p>
          <Button size="sm" onClick={handleDiagnose} disabled={isPending} className="rounded-xl text-xs gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            {isPending ? "Analisando..." : "Diagnosticar Agora"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const phase = result.phase;
  const cfg = PHASE_CONFIG[phase];
  const PhaseIcon = cfg.icon;

  return (
    <Card className={`${cfg.border} ${cfg.bg} rounded-2xl shadow-sm`}>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
              <PhaseIcon className={`h-5 w-5 ${cfg.color}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Fase da Conta</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                {cfg.label}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDiagnose} disabled={isPending} className="rounded-xl text-[10px] gap-1 h-7">
            <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {result.reason && (
          <p className="text-xs text-slate-600 leading-relaxed">{result.reason}</p>
        )}
        {result.recommendation && (
          <p className="text-xs text-slate-500 leading-relaxed">{result.recommendation}</p>
        )}

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400">Estratégia recomendada: </span>
            <span className="font-semibold text-slate-800">{BID_LABELS[result.suggestedBidStrategy] ?? result.suggestedBidStrategy}</span>
          </div>
          {result.suggestedEvent && (
            <div>
              <span className="text-slate-400">Evento sugerido: </span>
              <span className="font-semibold text-slate-800">{result.suggestedEvent}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
