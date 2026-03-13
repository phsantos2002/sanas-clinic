import { getPixel } from "@/app/actions/pixel";
import { getStages } from "@/app/actions/stages";
import { getAIConfig } from "@/app/actions/aiConfig";
import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { getGoogleBusinessConfig } from "@/app/actions/googleBusiness";
import { listCampaignsForSelector, getSelectedCampaignId } from "@/app/actions/meta";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";
import { CampaignSelector } from "@/components/forms/CampaignSelector";
import { WhatsAppConfigForm } from "@/components/forms/WhatsAppConfigForm";
import { GoogleBusinessForm } from "@/components/forms/GoogleBusinessForm";
import { ManageStagesSection } from "@/components/settings/ManageStagesSection";
import { AIConfigForm } from "@/components/settings/AIConfigForm";

export default async function SettingsPage() {
  const [pixel, stages, aiConfig, whatsappConfig, gbConfig, campaigns, selectedCampaignId] = await Promise.all([
    getPixel(),
    getStages(),
    getAIConfig(),
    getWhatsAppConfig(),
    getGoogleBusinessConfig(),
    listCampaignsForSelector(),
    getSelectedCampaignId(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie integrações, IA e pipeline
        </p>
      </div>

      <div className="space-y-4">
        {/* Facebook Pixel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Pixel do Facebook</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o Pixel ID e o Access Token para enviar eventos de conversão.
            </p>
          </div>
          <FacebookPixelForm pixel={pixel} />
        </div>

        {/* Campaign Selector */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Campanha Principal</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Selecione a campanha que será gerenciada na aba Meta e cujos insights aparecerão no Analytics.
            </p>
          </div>
          <CampaignSelector
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
          />
        </div>

        {/* Google Meu Negócio */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Google Meu Negócio</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Conecte seu perfil do Google para exibir avaliações, fotos e informações do negócio.
            </p>
          </div>
          <GoogleBusinessForm config={gbConfig} />
        </div>

        {/* WhatsApp Business */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">WhatsApp Business</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o número do WhatsApp para receber mensagens e responder automaticamente com IA.
            </p>
          </div>
          <WhatsAppConfigForm config={whatsappConfig} />
        </div>

        {/* IA */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Inteligência Artificial</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o provedor de IA, modelo e comportamento. Você fornece sua própria chave de API.
            </p>
          </div>
          <AIConfigForm config={aiConfig ?? {
            clinicName: "Sanas Clinic",
            systemPrompt: "",
            sendAudio: false,
            provider: "openai",
            model: "gpt-4o-mini",
            capabilities: "text",
            apiKey: "",
            voiceClonePrompt: "",
            openaiKey: "",
          }} />
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
