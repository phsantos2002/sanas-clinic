"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveWhatsAppConfig,
  saveEvolutionConfig,
  testWhatsAppConnection,
  getEvolutionQR,
  getEvolutionStatus,
  disconnectEvolution,
} from "@/app/actions/whatsapp";
import { toast } from "sonner";

type WhatsAppConfig = {
  provider: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  evolutionServerUrl: string | null;
  evolutionApiKey: string | null;
  evolutionInstanceName: string | null;
  evolutionInstanceId: string | null;
} | null;

type Props = {
  config: WhatsAppConfig;
};

export function WhatsAppConfigForm({ config }: Props) {
  const [provider, setProvider] = useState<"official" | "evolution">(
    (config?.provider as "official" | "evolution") ?? "official"
  );

  // Official fields
  const [phoneNumberId, setPhoneNumberId] = useState(config?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState(config?.accessToken ?? "");
  const [verifyToken, setVerifyToken] = useState(config?.verifyToken ?? "");

  // State
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  // Evolution-specific state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [evoConnected, setEvoConnected] = useState(false);
  const [evoState, setEvoState] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const isEvolutionConfigured = !!(config?.provider === "evolution" && config?.evolutionInstanceName);

  // Check Evolution connection status
  const checkStatus = useCallback(async () => {
    if (!isEvolutionConfigured) return;
    setCheckingStatus(true);
    const result = await getEvolutionStatus();
    setCheckingStatus(false);
    if (result.success && result.data) {
      setEvoConnected(result.data.connected);
      setEvoState(result.data.state ?? null);
    }
  }, [isEvolutionConfigured]);

  useEffect(() => {
    if (isEvolutionConfigured) {
      checkStatus();
    }
  }, [isEvolutionConfigured, checkStatus]);

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

  // ─── Evolution: criar instância e obter QR ───
  async function handleEvolutionConnect() {
    setLoading(true);
    const result = await saveEvolutionConfig();
    if (result.success) {
      // Usa QR Code retornado da criação da instância
      if (result.data?.qrcode) {
        setQrCode(result.data.qrcode);
        toast.success("Escaneie o QR Code para conectar.");
      } else {
        toast.success("Instância criada! Clique em 'QR Code' para conectar.");
      }
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  // ─── Get QR Code ───
  async function handleGetQR() {
    setLoadingQR(true);
    const result = await getEvolutionQR();
    setLoadingQR(false);
    if (result.success && result.data) {
      setQrCode(result.data.qrcode);
    } else if (!result.success) {
      toast.error(result.error);
    }
  }

  // ─── Disconnect Evolution ───
  async function handleDisconnect() {
    setLoading(true);
    const result = await disconnectEvolution();
    setLoading(false);
    if (result.success) {
      toast.success("WhatsApp desconectado");
      setEvoConnected(false);
      setQrCode(null);
      setEvoState(null);
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
            onClick={() => setProvider("evolution")}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              provider === "evolution"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            Evolution API
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {provider === "official"
            ? "Requer conta Meta Business verificada. Ideal para empresas com acesso à API oficial."
            : "Conecte via QR Code usando seu WhatsApp pessoal ou Business. Mantém o histórico de conversas."}
        </p>
      </div>

      {/* ─── Official API Form (mantido intacto) ─── */}
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

      {/* ─── Evolution API ─── */}
      {provider === "evolution" && (
        <div className="space-y-4">
          {/* Connection Status (quando já configurado) */}
          {isEvolutionConfigured && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${
              evoConnected
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                evoConnected ? "bg-green-500" : "bg-amber-500 animate-pulse"
              }`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  evoConnected ? "text-green-700" : "text-amber-700"
                }`}>
                  {evoConnected
                    ? "WhatsApp conectado"
                    : checkingStatus
                      ? "Verificando conexão..."
                      : `Desconectado${evoState ? ` (${evoState})` : ""}`
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
                {!evoConnected && (
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
          {qrCode && !evoConnected && (
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
          {!isEvolutionConfigured && !qrCode && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <p className="text-sm text-slate-600">
                  Clique no botão abaixo para gerar um QR Code. Depois, escaneie com seu WhatsApp para conectar.
                </p>
              </div>
              <Button
                type="button"
                disabled={loading}
                onClick={handleEvolutionConnect}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? "Criando conexão..." : "Conectar via QR Code"}
              </Button>
            </div>
          )}

          {/* Disconnect button */}
          {isEvolutionConfigured && (
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
