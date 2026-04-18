"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: React.ReactNode;
  /** Custom fallback UI. If omitted, renders default error card. */
  fallback?: React.ReactNode;
  /** Section label shown in the default fallback (e.g. "Pipeline", "Chat"). */
  section?: string;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * ErrorBoundary — catches React render errors in subtrees.
 *
 * Usage:
 *   <ErrorBoundary section="Pipeline">
 *     <KanbanBoard />
 *   </ErrorBoundary>
 *
 * Next.js also has file-based error.tsx for route segments, but this
 * component is useful for intra-page sections where we want partial
 * degradation rather than full page replacement.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Non-blocking: log to console so Sentry/Datadog can pick it up
    console.error("[ErrorBoundary]", { section: this.props.section, error, componentStack: info.componentStack });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const section = this.props.section ?? "este módulo";

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-red-100 bg-red-50">
        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-red-100 mb-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-red-800 mb-1">
          Erro ao carregar {section}
        </h3>
        <p className="text-xs text-red-600 max-w-xs mb-4">
          Algo inesperado aconteceu. Tente recarregar ou contate o suporte se o problema persistir.
        </p>
        <button
          onClick={this.reset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </button>
        {process.env.NODE_ENV === "development" && this.state.error && (
          <details className="mt-4 text-left max-w-sm">
            <summary className="text-xs text-red-500 cursor-pointer">Detalhes do erro</summary>
            <pre className="mt-2 text-xs text-red-700 bg-red-100 rounded p-2 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          </details>
        )}
      </div>
    );
  }
}

/**
 * Convenience wrapper for functional components.
 * Uses `key` reset pattern: pass `resetKey` to force re-mount after recovery.
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: { section?: string; fallback?: React.ReactNode } = {}
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary section={options.section} fallback={options.fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName ?? Component.name})`;
  return WrappedComponent;
}
