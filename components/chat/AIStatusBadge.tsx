"use client";

import { Bot, Pause, Clock } from "lucide-react";

type Props = {
  aiEnabled: boolean;
  pausedUntil?: Date | string | null;
  onToggle?: () => void;
};

function formatPauseLabel(until: Date): string {
  const now = new Date();
  const diffMs = until.getTime() - now.getTime();
  if (diffMs <= 0) return "";
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

export function AIStatusBadge({ aiEnabled, pausedUntil, onToggle }: Props) {
  const pauseDate = pausedUntil ? new Date(pausedUntil) : null;
  const isPaused = !!pauseDate && pauseDate.getTime() > Date.now();

  // Paused by human intervention — visually distinct from "off by toggle"
  if (isPaused && aiEnabled) {
    return (
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
        title={`IA pausada por resposta manual. Retoma em ${formatPauseLabel(pauseDate!)} ou clique para retomar agora.`}
      >
        <Clock className="h-3 w-3" />
        IA pausa {formatPauseLabel(pauseDate!)}
      </button>
    );
  }

  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        aiEnabled
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
      }`}
      title={
        aiEnabled
          ? "IA respondendo automaticamente. Clique para pausar."
          : "IA pausada. Clique para ativar."
      }
    >
      {aiEnabled ? (
        <>
          <Bot className="h-3 w-3" />
          IA ativa
        </>
      ) : (
        <>
          <Pause className="h-3 w-3" />
          IA pausada
        </>
      )}
    </button>
  );
}
