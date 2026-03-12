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
import { Separator } from "@/components/ui/separator";

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
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-slate-500">
          Gerencie seu Pixel do Facebook, IA, pipeline e tags
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Pixel do Facebook</h2>
          <p className="text-sm text-slate-500">
            Configure o Pixel ID e o Access Token para enviar eventos de conversão.
          </p>
        </div>
        <FacebookPixelForm pixel={pixel} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Google Analytics</h2>
          <p className="text-sm text-slate-500">
            Configure o Measurement ID para rastrear eventos e origem dos leads via Google Analytics.
          </p>
        </div>
        <GAConfigForm config={gaConfig} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">WhatsApp Business</h2>
          <p className="text-sm text-slate-500">
            Configure o número do WhatsApp para receber mensagens e responder automaticamente com IA.
          </p>
        </div>
        <WhatsAppConfigForm config={whatsappConfig} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Inteligência Artificial</h2>
          <p className="text-sm text-slate-500">
            Configure como a IA responde no WhatsApp. Você pode personalizar o prompt, o nome da clínica e ativar respostas em áudio.
          </p>
        </div>
        <AIConfigForm config={aiConfig ?? { clinicName: "Sanas Clinic", systemPrompt: "", sendAudio: false, openaiKey: "" }} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Colunas do Pipeline</h2>
          <p className="text-sm text-slate-500">
            Defina as etapas do funil e qual evento do Facebook cada coluna dispara ao receber um lead.
          </p>
        </div>
        <ManageStagesSection stages={stages} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Etiquetas (Tags)</h2>
          <p className="text-sm text-slate-500">
            Crie e gerencie as tags para classificar seus leads.
          </p>
        </div>
        <ManageTagsModal tags={tags} />
      </section>
    </div>
  );
}
