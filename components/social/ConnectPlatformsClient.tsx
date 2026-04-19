"use client";

import { useState } from "react";
import { Link2, Check, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { SocialConnectionData } from "@/app/actions/social";
import {
  saveSocialConnection,
  disconnectPlatform,
  testSocialConnection,
} from "@/app/actions/social";

type Platform = {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  available: boolean;
};

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    color: "text-pink-600",
    bgColor: "bg-gradient-to-br from-purple-500 to-pink-500",
    description: "Posts, Stories, Reels e Carrosseis",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "👍",
    color: "text-blue-600",
    bgColor: "bg-blue-600",
    description: "Posts, Videos e Stories na sua Page",
    available: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    color: "text-red-600",
    bgColor: "bg-red-600",
    description: "Videos, Shorts e conteudo no canal",
    available: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎬",
    color: "text-slate-900",
    bgColor: "bg-slate-900",
    description: "Videos curtos e trends",
    available: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "🔗",
    color: "text-blue-700",
    bgColor: "bg-blue-700",
    description: "Posts profissionais e artigos",
    available: false,
  },
  {
    id: "google_business",
    name: "Google Meu Negocio",
    icon: "📍",
    color: "text-green-600",
    bgColor: "bg-green-600",
    description: "Posts locais, novidades e ofertas",
    available: true,
  },
];

type ConnectModalState = {
  open: boolean;
  platform: Platform | null;
};

export function ConnectPlatformsClient({ connections }: { connections: SocialConnectionData[] }) {
  const [connectModal, setConnectModal] = useState<ConnectModalState>({
    open: false,
    platform: null,
  });
  const [accessToken, setAccessToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [saving, setSaving] = useState(false);

  const getConnection = (platformId: string) =>
    connections.find((c) => c.platform === platformId && c.isActive);

  const handleConnect = (platform: Platform) => {
    if (!platform.available) {
      toast.info("Em breve! Esta plataforma sera disponibilizada em uma atualizacao futura.");
      return;
    }
    setConnectModal({ open: true, platform });
    setAccessToken("");
    setPageId("");
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ name: string; picture?: string } | null>(null);

  const handleTestConnection = async () => {
    if (!connectModal.platform || !accessToken.trim()) return;
    setTesting(true);
    setTestResult(null);

    const result = await testSocialConnection(
      connectModal.platform.id,
      accessToken.trim(),
      pageId.trim() || undefined
    );

    setTesting(false);
    if (result.success && result.data) {
      setTestResult(result.data);
      toast.success(`Conexao verificada: ${result.data.name}`);
    } else {
      toast.error(result.success ? "Erro desconhecido" : result.error);
    }
  };

  const handleSaveConnection = async () => {
    if (!connectModal.platform || !accessToken.trim()) return;
    setSaving(true);

    const result = await saveSocialConnection({
      platform: connectModal.platform.id,
      accessToken: accessToken.trim(),
      pageId: pageId.trim() || undefined,
      profileName: testResult?.name || connectModal.platform.name,
      profilePicture: testResult?.picture,
    });

    setSaving(false);
    if (result.success) {
      toast.success(`${connectModal.platform.name} conectado com sucesso!`);
      setConnectModal({ open: false, platform: null });
      setTestResult(null);
    } else {
      toast.error(result.error);
    }
  };

  const handleDisconnect = async (platformId: string, platformName: string) => {
    const result = await disconnectPlatform(platformId);
    if (result.success) {
      toast.success(`${platformName} desconectado`);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Link2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Conexoes de Plataformas</h2>
            <p className="text-sm text-slate-400">
              Conecte suas redes sociais para publicar automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const connection = getConnection(platform.id);
          const isConnected = !!connection;

          return (
            <div
              key={platform.id}
              className={`bg-white border rounded-2xl p-5 transition-all ${
                isConnected
                  ? "border-green-200 shadow-sm"
                  : platform.available
                    ? "border-slate-100 hover:border-slate-200 hover:shadow-sm"
                    : "border-slate-50 opacity-60"
              }`}
            >
              {/* Platform header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 ${platform.bgColor} rounded-xl flex items-center justify-center text-white text-xl`}
                  >
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">{platform.name}</h3>
                    <p className="text-xs text-slate-400">{platform.description}</p>
                  </div>
                </div>
              </div>

              {/* Status + Action */}
              {isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <Check className="h-4 w-4" />
                    <span className="font-medium">Conectado</span>
                    {connection.profileName && (
                      <span className="text-green-500 text-xs ml-auto truncate max-w-[120px]">
                        {connection.profileName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDisconnect(platform.id, platform.name)}
                    className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-1"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(platform)}
                  className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                    platform.available
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : "bg-slate-50 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {platform.available ? "Conectar" : "Em breve"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Info card */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-amber-800 text-sm">Instagram e Facebook</h3>
            <p className="text-xs text-amber-600 mt-1">
              Para conectar Instagram e Facebook, utilize o mesmo token da Meta Graph API
              configurado no modulo Meta Ads. Voce precisara expandir as permissoes para incluir{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">pages_manage_posts</code>,{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">instagram_content_publish</code> e{" "}
              <code className="bg-amber-100 px-1 rounded text-xs">instagram_basic</code>.
            </p>
            <a
              href="https://developers.facebook.com/docs/pages-api/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium mt-2"
            >
              Ver documentacao <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {connectModal.open && connectModal.platform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`h-10 w-10 ${connectModal.platform.bgColor} rounded-xl flex items-center justify-center text-white text-lg`}
              >
                {connectModal.platform.icon}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Conectar {connectModal.platform.name}
                </h3>
                <p className="text-xs text-slate-400">Insira as credenciais de acesso</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Access Token
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Cole seu token de acesso"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {(connectModal.platform.id === "instagram" ||
                connectModal.platform.id === "facebook") && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Page ID / Account ID
                  </label>
                  <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="ID da pagina ou conta"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Test result */}
            {testResult && (
              <div className="flex items-center gap-2 mt-3 bg-green-50 border border-green-100 rounded-xl p-3">
                {testResult.picture && (
                  <img src={testResult.picture} alt="" className="h-8 w-8 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-medium text-green-700">{testResult.name}</p>
                  <p className="text-xs text-green-600">Conexao verificada</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setConnectModal({ open: false, platform: null });
                  setTestResult(null);
                }}
                className="py-2 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleTestConnection}
                disabled={testing || !accessToken.trim()}
                className="py-2 px-4 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                {testing ? "Testando..." : "Testar"}
              </button>
              <button
                onClick={handleSaveConnection}
                disabled={saving || !accessToken.trim()}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Conectando..." : "Conectar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
