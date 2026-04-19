"use client";

import { useState, useTransition } from "react";
import { BookOpen, Zap, TrendingUp, Crown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  diagnoseAccountPhase,
  saveAccountPhase,
  type AccountPhaseResult,
} from "@/app/actions/accountPhase";

type Phase = "LEARNING" | "STABILIZING" | "SCALING" | "MATURE";

const PHASE_CONFIG: Record<
  Phase,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: typeof BookOpen;
    tooltip: string;
  }
> = {
  LEARNING: {
    label: "Aprendizado",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: BookOpen,
    tooltip: "A Meta está otimizando a entrega. Evite mudanças por 3-5 dias.",
  },
  STABILIZING: {
    label: "Estabilização",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Zap,
    tooltip: "A conta está acumulando dados. Bom momento para testar Cost Cap.",
  },
  SCALING: {
    label: "Escala",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: TrendingUp,
    tooltip: "Conta estável com histórico. Ideal para escalar com Bid Cap.",
  },
  MATURE: {
    label: "Maturidade",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    icon: Crown,
    tooltip: "Conta madura com dados robustos. Teste ROAS Mínimo para maximizar retorno.",
  },
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

export function AccountPhaseCard({
  userId,
  initialPhase,
  initialBidStrategy,
  conversionDestination,
}: Props) {
  const [result, setResult] = useState<AccountPhaseResult | null>(
    initialPhase
      ? {
          phase: initialPhase,
          reason: "",
          recommendation: "",
          suggestedBidStrategy:
            (initialBidStrategy as AccountPhaseResult["suggestedBidStrategy"]) ?? "LOWEST_COST",
          suggestedEvent: "",
        }
      : null
  );
  const [isPending, startTransition] = useTransition();
  const [showTooltip, setShowTooltip] = useState(false);

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
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50">
        <span className="text-xs text-slate-500">Fase da conta não diagnosticada</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDiagnose}
          disabled={isPending}
          className="h-7 text-[10px] rounded-lg gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Analisando..." : "Diagnosticar"}
        </Button>
      </div>
    );
  }

  const phase = result.phase;
  const cfg = PHASE_CONFIG[phase];
  const PhaseIcon = cfg.icon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${cfg.border} ${cfg.bg}`}
    >
      <PhaseIcon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />

      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
        <div className="relative">
          <span
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border} cursor-help`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            Fase: {cfg.label}
          </span>
          {showTooltip && (
            <div className="absolute z-10 top-full left-0 mt-1 w-64 p-2 rounded-lg bg-slate-900 text-white text-[10px] leading-relaxed shadow-lg">
              {cfg.tooltip}
              {result.reason && (
                <>
                  <br />
                  <br />
                  {result.reason}
                </>
              )}
            </div>
          )}
        </div>

        <span className="text-[10px] text-slate-400 hidden sm:inline">|</span>
        <span className="text-[10px] text-slate-600">
          Estratégia recomendada:{" "}
          <strong>{BID_LABELS[result.suggestedBidStrategy] ?? result.suggestedBidStrategy}</strong>
        </span>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleDiagnose}
        disabled={isPending}
        className="h-7 text-[10px] rounded-lg gap-1 flex-shrink-0"
      >
        <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Atualizar</span>
      </Button>
    </div>
  );
}

// Re-export phase for parent usage
export type { Phase };
