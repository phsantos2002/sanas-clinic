import { getPixel } from "@/app/actions/pixel";
import { getTags } from "@/app/actions/tags";
import { getStages } from "@/app/actions/stages";
import { getAIConfig } from "@/app/actions/aiConfig";
import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { getGAConfig } from "@/app/actions/ga";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";
import { WhatsAppConfigForm } from "@/components/forms/WhatsAppConfigForm";
import { GAConfigForm } from "@/components/forms/GAConfigForm";
import { ManageTagsModal } from "@/components/modals/ManageTagsModal";
import { ManageStagesSection } from "@/components/settings/ManageStagesSection";
import { AIConfigForm } from "@/components/settings/AIConfigForm";

export default async function SettingsPage() {
  const [pixel, tags, stages, aiConfig, whatsappConfig, gaConfig] = await Promise.all([
    getPixel(),
    getTags(),
    getStages(),
    getAIConfig(),
    getWhatsAppConfig(),
    getGAConfig(),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie seu Pixel do Facebook, IA, pipeline e tags
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

        {/* Google Analytics */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Google Analytics</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure o Measurement ID para rastrear eventos e origem dos leads via Google Analytics.
            </p>
          </div>
          <GAConfigForm config={gaConfig} />
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
              Configure como a IA responde no WhatsApp. Personalize o prompt, o nome da clínica e ative respostas em áudio.
            </p>
          </div>
          <AIConfigForm config={aiConfig ?? { clinicName: "Sanas Clinic", systemPrompt: "", sendAudio: false, openaiKey: "" }} />
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

        {/* Tags */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Etiquetas (Tags)</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Crie e gerencie as tags para classificar seus leads.
            </p>
          </div>
          <ManageTagsModal tags={tags} />
        </div>
      </div>
    </div>
  );
}
