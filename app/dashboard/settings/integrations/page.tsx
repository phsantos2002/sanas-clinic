import { getPixel } from "@/app/actions/pixel";
import { getAIConfig } from "@/app/actions/aiConfig";
import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { getSocialConnections } from "@/app/actions/social";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";
import { WhatsAppConfigForm } from "@/components/forms/WhatsAppConfigForm";
import { SetupProgress } from "@/components/settings/SetupProgress";

export default async function IntegrationsPage() {
  const [pixel, aiConfig, whatsappConfig, connections] = await Promise.all([
    getPixel(),
    getAIConfig(),
    getWhatsAppConfig(),
    getSocialConnections(),
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      <SetupProgress />

      {/* Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Meta Ads", connected: !!pixel?.pixelId, color: "bg-blue-50 text-blue-600" },
          { label: "WhatsApp", connected: !!whatsappConfig, color: "bg-green-50 text-green-600" },
          {
            label: "IA (OpenAI)",
            connected: !!aiConfig?.apiKey,
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Redes Sociais",
            connected: connections.length > 0,
            color: "bg-pink-50 text-pink-600",
          },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
            <div
              className={`h-2 w-2 rounded-full mx-auto mb-1.5 ${item.connected ? "bg-green-500" : "bg-slate-300"}`}
            />
            <p className="text-xs font-medium">{item.label}</p>
            <p className="text-[10px] mt-0.5">{item.connected ? "Conectado" : "Pendente"}</p>
          </div>
        ))}
      </div>

      {/* Meta Pixel + Ads */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Meta Ads & Pixel</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Pixel ID, Access Token e conta de anuncios
          </p>
        </div>
        <FacebookPixelForm pixel={pixel} />
      </div>

      {/* WhatsApp */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">WhatsApp Business</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            API oficial (Meta Cloud) ou Uazapi para atendimento e automacoes
          </p>
        </div>
        <WhatsAppConfigForm config={whatsappConfig} />
      </div>

      {/* Social Connections */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Redes Sociais</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {connections.length} plataforma{connections.length !== 1 ? "s" : ""} conectada
              {connections.length !== 1 ? "s" : ""}
            </p>
          </div>
          <a
            href="/dashboard/posts/connect"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Gerenciar conexoes →
          </a>
        </div>
        {connections.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {connections.map((c) => (
              <span
                key={c.id}
                className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg flex items-center gap-1"
              >
                <span className="h-1.5 w-1.5 bg-green-500 rounded-full" />
                {c.platform}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center pt-2">
        Procurando configuracoes de IA? Elas estao na aba{" "}
        <a href="/dashboard/settings/ai" className="text-indigo-600 font-medium">
          IA Chat
        </a>
      </p>
    </div>
  );
}
