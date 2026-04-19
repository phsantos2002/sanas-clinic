"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

/**
 * Next.js App Router error boundary for the entire /dashboard segment.
 * Rendered when an unhandled error propagates from any dashboard page/layout.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to external error tracking (Sentry, etc.) when available
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-slate-800 mb-2">Algo deu errado</h1>
        <p className="text-sm text-slate-500 mb-6">
          Ocorreu um erro inesperado. Tente recarregar a página ou volte ao início.
          {error.digest && (
            <span className="block mt-1 text-xs text-slate-400">Código: {error.digest}</span>
          )}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-slate-400 cursor-pointer">Detalhes (dev)</summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-3 overflow-auto max-h-40 text-left">
              {error.message}
              {"\n"}
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
