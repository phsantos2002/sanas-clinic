"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Wifi } from "lucide-react";

type IntegrationStatus = {
  name: string;
  status: "connected" | "error" | "warning" | "unconfigured";
  message: string;
  lastChecked?: string;
};

type Props = {
  integrations: IntegrationStatus[];
  onTest: (name: string) => Promise<IntegrationStatus>;
};

const STATUS_CONFIG = {
  connected: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Conectado",
  },
  error: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "Erro",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Atencao",
  },
  unconfigured: {
    icon: Wifi,
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    label: "Nao configurado",
  },
};

export function IntegrationHealth({ integrations: initial, onTest }: Props) {
  const [integrations, setIntegrations] = useState(initial);
  const [testing, setTesting] = useState<string | null>(null);

  const handleTest = async (name: string) => {
    setTesting(name);
    const result = await onTest(name);
    setIntegrations((prev) => prev.map((i) => (i.name === name ? result : i)));
    setTesting(null);
  };

  return (
    <div className="space-y-2">
      {integrations.map((integration) => {
        const cfg = STATUS_CONFIG[integration.status];
        const Icon = cfg.icon;
        const isTesting = testing === integration.name;

        return (
          <div
            key={integration.name}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg}`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{integration.name}</p>
              <p className="text-xs text-slate-500">{integration.message}</p>
              {integration.lastChecked && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Verificado: {integration.lastChecked}
                </p>
              )}
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <button
              onClick={() => handleTest(integration.name)}
              disabled={isTesting}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors"
              title="Testar conexao"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isTesting ? "animate-spin" : ""}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
