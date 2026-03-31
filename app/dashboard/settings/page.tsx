import { getPixel } from "@/app/actions/pixel";
import { getStages } from "@/app/actions/stages";
import { getAIConfig } from "@/app/actions/aiConfig";
import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { getContentGenSettings, getAIUsageStats, getBusinessProfile, getAutomations, saveBusinessProfile, saveAutomations } from "@/app/actions/brandSettings";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";
import { WhatsAppConfigForm } from "@/components/forms/WhatsAppConfigForm";
import { ManageStagesSection } from "@/components/settings/ManageStagesSection";
import { AIConfigForm } from "@/components/settings/AIConfigForm";
import { BrandIdentityForm } from "@/components/settings/BrandIdentityForm";
import { ContentGenKeysForm } from "@/components/settings/ContentGenKeysForm";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { AutomationsForm } from "@/components/settings/AutomationsForm";

export default async function SettingsPage() {
  const [pixel, stages, aiConfig, whatsappConfig, contentGen, usage, businessProfile, automations] = await Promise.all([
    getPixel(),
    getStages(),
    getAIConfig(),
    getWhatsAppConfig(),
    getContentGenSettings(),
    getAIUsageStats(),
    getBusinessProfile(),
    getAutomations(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Configuracoes</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Gerencie integracoes, IA, automacoes e pipeline
        </p>
      </div>

      <div className="space-y-4">
        {/* Business Profile */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Perfil do Negocio</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Informacoes do seu negocio usadas pela IA e pelo sistema
            </p>
          </div>
          <BusinessProfileForm initial={businessProfile} onSave={saveBusinessProfile} />
        </div>

        {/* Automations */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Automacoes</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Ative ou desative automacoes do sistema
            </p>
          </div>
          <AutomationsForm initial={automations} onSave={saveAutomations} />
        </div>

        {/* Facebook Pixel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Pixel do Facebook</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o Pixel ID e o Access Token para enviar eventos de conversao.
            </p>
          </div>
          <FacebookPixelForm pixel={pixel} />
        </div>

        {/* WhatsApp Business */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">WhatsApp Business</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o numero do WhatsApp para receber mensagens e responder automaticamente com IA.
            </p>
          </div>
          <WhatsAppConfigForm config={whatsappConfig} />
        </div>

        {/* IA */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Inteligencia Artificial</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o provedor de IA, modelo e comportamento.
            </p>
          </div>
          <AIConfigForm config={aiConfig ?? {
            clinicName: "Sanas Clinic", systemPrompt: "", sendAudio: false,
            provider: "openai", model: "gpt-4o-mini", capabilities: "text",
            apiKey: "", voiceClonePrompt: "", openaiKey: "",
          }} />
        </div>

        {/* Brand Identity */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Identidade Visual</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Usada pela IA para gerar conteudo alinhado com sua marca
            </p>
          </div>
          <BrandIdentityForm initial={contentGen?.brandIdentity ?? {}} />
        </div>

        {/* Content Generation API Keys */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Chaves de API — Geracao de Conteudo</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure os provedores para gerar imagens e videos com IA.
            </p>
          </div>
          <ContentGenKeysForm
            initial={{
              aiImageProvider: contentGen?.aiImageProvider ?? "openai",
              aiImageApiKey: contentGen?.aiImageApiKey ?? "",
              aiVideoProvider: contentGen?.aiVideoProvider ?? "none",
              aiVideoApiKey: contentGen?.aiVideoApiKey ?? "",
            }}
            usage={usage}
          />
        </div>

        {/* Pipeline */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Colunas do Pipeline</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Defina as etapas do funil e qual evento do Facebook cada coluna dispara ao receber um lead.
            </p>
          </div>
          <ManageStagesSection stages={stages} />
        </div>
      </div>
    </div>
  );
}
