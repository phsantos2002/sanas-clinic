"use client";

import { useEffect } from "react";
import { RefreshCw, BarChart3 } from "lucide-react";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AnalyticsError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-slate-100 mb-4">
        <BarChart3 className="h-7 w-7 text-slate-400" />
      </div>
      <h2 className="text-base font-semibold text-slate-800 mb-1">Erro ao carregar Analytics</h2>
      <p className="text-sm text-slate-500 mb-5 max-w-xs">
        Não foi possível carregar os dados de análise. Tente novamente em instantes.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  );
}
