"use client";

import { Bot, Pause, Clock } from "lucide-react";

type Props = {
  aiEnabled: boolean;
  onToggle?: () => void;
};

export function AIStatusBadge({ aiEnabled, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        aiEnabled
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
      }`}
      title={aiEnabled ? "IA respondendo automaticamente. Clique para pausar." : "IA pausada. Clique para ativar."}
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
