"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveWhatsAppConfig,
  saveWahaConfig,
  testWhatsAppConnection,
  getWahaQR,
  getWahaStatus,
  disconnectWaha,
  syncWhatsAppChats,
  syncWhatsAppMessages,
} from "@/app/actions/whatsapp";
import { toast } from "sonner";

type WhatsAppConfig = {
  provider: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  wahaServerUrl: string | null;
  wahaApiKey: string | null;
  wahaSessionName: string | null;
} | null;

type Props = {
  config: WhatsAppConfig;
};

export function WhatsAppConfigForm({ config }: Props) {
  const [provider, setProvider] = useState<"official" | "waha">(
    (config?.provider as "official" | "waha") ?? "official"
  );

  // Official fields
  const [phoneNumberId, setPhoneNumberId] = useState(config?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState(config?.accessToken ?? "");
  const [verifyToken, setVerifyToken] = useState(config?.verifyToken ?? "");

  // State
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // WAHA-specific state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [wahaConnected, setWahaConnected] = useState(false);
  const [wahaState, setWahaState] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isWahaConfigured = !!(config?.provider === "waha" && config?.wahaSessionName);

  // Check WAHA connection status
  const checkStatus = useCallback(async () => {
    if (!isWahaConfigured) return;
    setCheckingStatus(true);
    const result = await getWahaStatus();
    setCheckingStatus(false);
    if (result.success && result.data) {
      setWahaConnected(result.data.connected);
      setWahaState(result.data.state ?? null);
    }
  }, [isWahaConfigured]);

  useEffect(() => {
    if (isWahaConfigured) {
      checkStatus();
    }
  }, [isWahaConfigured, checkStatus]);

  // ─── Official API submit ───
  async function handleOfficialSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneNumberId.trim() || !accessToken.trim() || !verifyToken.trim()) return;
    setLoading(true);
    const result = await saveWhatsAppConfig(phoneNumberId, accessToken, verifyToken);
    setLoading(false);
    if (result.success) {
      toast.success("Configurações do WhatsApp salvas");
    } else {
      toast.error(result.error);
    }
  }

  // ─── WAHA: criar sessão e obter QR ───
  async function handleWahaConnect() {
    setLoading(true);
    const result = await saveWahaConfig();
    if (result.success) {
      if (result.data?.qrcode) {
        setQrCode(result.data.qrcode);
        toast.success("Escaneie o QR Code para conectar.");
      } else {
        // Session created but QR didn't come — fetch it
        toast.info("Sessão criada, buscando QR Code...");
        const qr = await getWahaQR();
        if (qr.success && qr.data?.qrcode) {
          setQrCode(qr.data.qrcode);
          toast.success("Escaneie o QR Code para conectar.");
        } else {
          toast.error("QR Code não disponível. Tente clicar em 'QR Code'.");
        }
      }
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  // ─── Get QR Code ───
  async function handleGetQR() {
    setLoadingQR(true);
    const result = await getWahaQR();
    setLoadingQR(false);
    if (result.success && result.data) {
      setQrCode(result.data.qrcode);
    } else if (!result.success) {
      toast.error(result.error);
    }
  }

  // ─── Disconnect WAHA ───
  async function handleDisconnect() {
    setLoading(true);
    const result = await disconnectWaha();
    setLoading(false);
    if (result.success) {
      toast.success("WhatsApp desconectado");
      setWahaConnected(false);
      setQrCode(null);
      setWahaState(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-5 max-w-md">
      {/* Provider Toggle */}
      <div className="space-y-2">
        <Label>Tipo de conexão</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProvider("official")}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              provider === "official"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            API Oficial
          </button>
          <button
            type="button"
            onClick={() => setProvider("waha")}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              provider === "waha"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            WAHA (QR Code)
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {provider === "official"
            ? "Requer conta Meta Business verificada. Ideal para empresas com acesso à API oficial."
            : "Conecte via QR Code usando seu WhatsApp pessoal ou Business. Gratuito e sem burocracia."}
        </p>
      </div>

      {/* ─── Official API Form ─── */}
      {provider === "official" && (
        <form onSubmit={handleOfficialSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumberId">Phone Number ID</Label>
            <Input
              id="phoneNumberId"
              placeholder="Ex: 123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              required
            />
            <p className="text-xs text-zinc-400">
              Encontre em Meta Developers → WhatsApp → Configuração da API → Phone Number ID.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsappToken">Access Token</Label>
            <Input
              id="whatsappToken"
              type="password"
              placeholder="Token de acesso permanente"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
            />
            <p className="text-xs text-zinc-400">
              Token com permissão <span className="font-mono">whatsapp_business_messaging</span>. Gere em Meta Developers → WhatsApp.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="verifyToken">Verify Token</Label>
            <Input
              id="verifyToken"
              placeholder="Crie uma senha secreta qualquer"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              required
            />
            <p className="text-xs text-zinc-400">
              Você define este valor e usa o mesmo ao configurar o webhook na Meta.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar WhatsApp"}
            </Button>
            {config && config.provider === "official" && (
              <Button
                type="button"
                variant="outline"
                disabled={testing}
                onClick={async () => {
                  setTesting(true);
                  const result = await testWhatsAppConnection();
                  setTesting(false);
                  if (result.success) {
                    toast.success("Conexão com WhatsApp OK!");
                  } else {
                    toast.error(result.error);
                  }
                }}
              >
                {testing ? "Testando..." : "Testar Conexão"}
              </Button>
            )}
          </div>
        </form>
      )}

      {/* ─── WAHA ─── */}
      {provider === "waha" && (
        <div className="space-y-4">
          {/* Connection Status (quando já configurado) */}
          {isWahaConfigured && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              wahaConnected
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                wahaConnected ? "bg-green-500" : "bg-amber-500 animate-pulse"
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  wahaConnected ? "text-green-700" : "text-amber-700"
                }`}>
                  {wahaConnected
                    ? "WhatsApp conectado"
                    : checkingStatus
                      ? "Verificando conexão..."
                      : `Desconectado${wahaState ? ` (${wahaState})` : ""}`
                  }
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={checkingStatus}
                  onClick={checkStatus}
                >
                  {checkingStatus ? "..." : "Atualizar"}
                </Button>
                {!wahaConnected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loadingQR}
                    onClick={handleGetQR}
                  >
                    {loadingQR ? "..." : "QR Code"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* QR Code Display */}
          {qrCode && !wahaConnected && (
            <div className="flex flex-col items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl">
              <p className="text-sm font-medium text-slate-700">
                Escaneie o QR Code com seu WhatsApp
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg"
              />
              <p className="text-xs text-slate-400 text-center">
                Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  checkStatus();
                  setQrCode(null);
                }}
              >
                Já escaneei
              </Button>
            </div>
          )}

          {/* Botão de conectar (quando ainda não configurado) */}
          {!isWahaConfigured && !qrCode && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-sm text-slate-600">
                  Clique no botão abaixo para gerar um QR Code. Depois, escaneie com seu WhatsApp para conectar.
                </p>
              </div>
              <Button
                type="button"
                disabled={loading}
                onClick={handleWahaConnect}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? "Criando conexão..." : "Conectar via QR Code"}
              </Button>
            </div>
          )}

          {/* Sync buttons (quando conectado) */}
          {isWahaConfigured && wahaConnected && (
            <div className="space-y-2">
              <Button
                type="button"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  // 1. Sync contacts
                  toast.info("Importando contatos...");
                  const result = await syncWhatsAppChats();
                  if (result.success && result.data) {
                    toast.success(`${result.data.imported} contatos importados`);
                  } else if (!result.success) {
                    toast.error(result.error);
                    setSyncing(false);
                    return;
                  }

                  // 2. Sync messages in batches
                  let totalMsgs = 0;
                  let remaining = 999;
                  let rounds = 0;
                  while (remaining > 0 && rounds < 50) {
                    toast.info(`Importando mensagens... (${totalMsgs} até agora)`);
                    const msgResult = await syncWhatsAppMessages();
                    if (!msgResult.success) break;
                    totalMsgs += msgResult.data?.messagesImported ?? 0;
                    remaining = msgResult.data?.remaining ?? 0;
                    rounds++;
                    if ((msgResult.data?.messagesImported ?? 0) === 0) break;
                  }

                  setSyncing(false);
                  toast.success(`Sincronização completa: ${totalMsgs} mensagens importadas`);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {syncing ? "Sincronizando..." : "Sincronizar Conversas do WhatsApp"}
              </Button>
            </div>
          )}

          {/* Disconnect button */}
          {isWahaConfigured && (
            <Button
              type="button"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={loading}
              onClick={handleDisconnect}
            >
              {loading ? "Desconectando..." : "Desconectar WhatsApp"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
