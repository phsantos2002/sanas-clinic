import { getPixel } from "@/app/actions/pixel";
import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";
import { WhatsAppConfigForm } from "@/components/forms/WhatsAppConfigForm";
import { SetupProgress } from "@/components/settings/SetupProgress";

export default async function IntegrationsPage() {
  const [pixel, whatsappConfig] = await Promise.all([getPixel(), getWhatsAppConfig()]);

  return (
    <div className="space-y-4 max-w-2xl">
      <SetupProgress />

      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Meta Ads", connected: !!pixel?.pixelId, color: "bg-blue-50 text-blue-600" },
          { label: "WhatsApp", connected: !!whatsappConfig, color: "bg-green-50 text-green-600" },
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

      <p className="text-xs text-slate-400 text-center pt-2">
        Configuracoes de IA estao na aba{" "}
        <a href="/dashboard/settings/ai" className="text-indigo-600 font-medium">
          IA Chat
        </a>
      </p>
    </div>
  );
}
