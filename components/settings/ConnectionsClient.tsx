"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Smartphone, QrCode, Power, Star, RefreshCw, Bot } from "lucide-react";
import { toast } from "sonner";
import {
  createConnection,
  getConnectionQR,
  getConnectionStatus,
  disconnectConnection,
  setDefaultConnection,
  type ConnectionData,
} from "@/app/actions/connections";
import type { AttendantData } from "@/app/actions/whatsappHub";

type Props = {
  connections: ConnectionData[];
  attendants: AttendantData[];
};

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-green-100 text-green-700",
  connecting: "bg-amber-100 text-amber-700",
  disconnected: "bg-slate-100 text-slate-500",
};

export function ConnectionsClient({ connections, attendants }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [attendantId, setAttendantId] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrConnectionId, setQrConnectionId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, { connected: boolean; state?: string }>>(
    {}
  );

  // Vendedores sem conexão ativa (1 número por vendedor)
  const usedAttendantIds = new Set(
    connections.filter((c) => c.isActive && c.attendantId).map((c) => c.attendantId)
  );
  const availableAttendants = attendants.filter((a) => a.isActive && !usedAttendantIds.has(a.id));

  const refreshStatuses = useCallback(async () => {
    const active = connections.filter((c) => c.isActive);
    const results = await Promise.all(
      active.map(async (c) => ({ id: c.id, status: await getConnectionStatus(c.id) }))
    );
    const next: Record<string, { connected: boolean; state?: string }> = {};
    for (const r of results) {
      if (r.status.success && r.status.data) next[r.id] = r.status.data;
    }
    setStatuses(next);
  }, [connections]);

  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  // Enquanto o QR está aberto, checa a cada 4s se pareou
  useEffect(() => {
    if (!qrConnectionId) return;
    const interval = setInterval(async () => {
      const result = await getConnectionStatus(qrConnectionId);
      if (result.success && result.data?.connected) {
        toast.success("WhatsApp conectado!");
        setQrCode(null);
        setQrConnectionId(null);
        router.refresh();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [qrConnectionId, router]);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setCreating(true);
    const result = await createConnection({ label: label.trim(), attendantId: attendantId || null });
    setCreating(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setShowCreate(false);
    setLabel("");
    setAttendantId("");
    if (result.data?.qrcode) {
      setQrCode(result.data.qrcode);
      setQrConnectionId(result.data.id);
    } else {
      toast.info("Conexao criada. Clique em 'QR' para parear.");
    }
    router.refresh();
  };

  const handleShowQR = async (id: string) => {
    const result = await getConnectionQR(id);
    if (!result.success) {
      toast.error(result.error ?? "QR nao disponivel");
      return;
    }
    if (!result.data) {
      toast.error("QR nao disponivel");
      return;
    }
    setQrCode(result.data.qrcode);
    setQrConnectionId(id);
  };

  const handleDisconnect = async (id: string) => {
    const result = await disconnectConnection(id);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Conexao desconectada");
      router.refresh();
    }
  };

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultConnection(id);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-indigo-500" /> Conexoes WhatsApp
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Um numero por vendedor. As respostas saem sempre pelo numero que o lead chamou.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshStatuses}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
            title="Atualizar status"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3.5 py-2 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova conexao
          </button>
        </div>
      </div>

      {connections.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <Smartphone className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhuma conexao ainda.</p>
          <p className="text-xs text-slate-400 mt-1">
            Crie a primeira conexao e escaneie o QR com o WhatsApp do numero.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {connections.map((conn) => {
            const live = statuses[conn.id];
            const statusKey = live ? (live.connected ? "connected" : "disconnected") : conn.status;
            return (
              <div
                key={conn.id}
                className={`bg-white border rounded-2xl p-4 space-y-3 ${
                  conn.isActive ? "border-slate-100" : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-medium text-slate-900 text-sm truncate">{conn.label}</h4>
                      {conn.isDefault && (
                        <span title="Conexao padrao">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                        </span>
                      )}
                      {conn.aiEnabled && (
                        <span title="IA ativa neste numero">
                          <Bot className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {conn.attendantName ?? "Numero compartilhado"}
                      {conn.phoneNumber ? ` · ${conn.phoneNumber}` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                      STATUS_STYLES[statusKey] ?? STATUS_STYLES.disconnected
                    }`}
                  >
                    {statusKey === "connected"
                      ? "Conectado"
                      : statusKey === "connecting"
                        ? "Conectando"
                        : "Desconectado"}
                  </span>
                </div>

                {conn.isActive && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                    <button
                      onClick={() => handleShowQR(conn.id)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      <QrCode className="h-3.5 w-3.5" /> QR
                    </button>
                    {!conn.isDefault && (
                      <button
                        onClick={() => handleSetDefault(conn.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600"
                      >
                        <Star className="h-3.5 w-3.5" /> Tornar padrao
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 ml-auto"
                    >
                      <Power className="h-3.5 w-3.5" /> Desconectar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="font-semibold text-slate-900">Nova conexao WhatsApp</h3>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nome (ex.: Joao — Vendas)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Vendedor responsavel (opcional)
              </label>
              <select
                value={attendantId}
                onChange={(e) => setAttendantId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Numero compartilhado (sem vendedor)</option>
                {availableAttendants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1 px-1">
                Leads que chamarem neste numero serao atendidos por este vendedor.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !label.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl"
              >
                {creating ? "Criando..." : "Criar e gerar QR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR modal */}
      {qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3 text-center">
            <h3 className="font-semibold text-slate-900">Escaneie com o WhatsApp</h3>
            <p className="text-xs text-slate-400">
              WhatsApp → Aparelhos conectados → Conectar aparelho
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="QR Code" className="mx-auto w-56 h-56 rounded-xl border" />
            <p className="text-[10px] text-slate-400">Detectando pareamento automaticamente...</p>
            <button
              onClick={() => {
                setQrCode(null);
                setQrConnectionId(null);
              }}
              className="w-full border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
