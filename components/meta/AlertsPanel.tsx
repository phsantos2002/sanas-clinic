"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, XCircle, CheckCircle, X, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type Alert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  suggestion: string;
  resolved: boolean;
  createdAt: Date;
};

type Props = {
  initialAlerts: Alert[];
  onResolve: (alertId: string) => Promise<{ success: boolean }>;
  onRefresh?: () => Promise<Alert[]>;
};

export function AlertsPanel({ initialAlerts, onResolve, onRefresh }: Props) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === "CRITICAL");
  const warningAlerts = unresolvedAlerts.filter((a) => a.severity === "WARNING");

  function handleResolve(alertId: string) {
    startTransition(async () => {
      const result = await onResolve(alertId);
      if (result.success) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)));
        toast.success("Alerta resolvido");
      } else {
        toast.error("Erro ao resolver alerta");
      }
    });
  }

  function handleRefresh() {
    if (!onRefresh) return;
    startRefresh(async () => {
      const newAlerts = await onRefresh();
      setAlerts(newAlerts);
      toast.success("Alertas atualizados");
    });
  }

  if (unresolvedAlerts.length === 0) {
    return (
      <Card className="border-emerald-100 bg-emerald-50/30 rounded-2xl shadow-sm">
        <CardContent className="py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Tudo funcionando bem</p>
              <p className="text-xs text-emerald-600">Nenhum alerta ativo no momento</p>
            </div>
          </div>
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-xl gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Analisando..." : "Verificar"}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              {unresolvedAlerts.length}
            </span>
          </CardTitle>
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 text-xs text-slate-400 hover:text-slate-600 rounded-xl gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Analisando..." : "Atualizar"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {[...criticalAlerts, ...warningAlerts].map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl p-3 border-l-4 ${
              alert.severity === "CRITICAL"
                ? "bg-red-50 border-l-red-400"
                : "bg-amber-50 border-l-amber-400"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                {alert.severity === "CRITICAL" ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800">{alert.message}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{alert.suggestion}</p>
                </div>
              </div>
              <button
                onClick={() => handleResolve(alert.id)}
                disabled={isPending}
                className="text-slate-300 hover:text-slate-500 flex-shrink-0"
                title="Marcar como resolvido"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
