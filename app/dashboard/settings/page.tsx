import { getPixel } from "@/app/actions/pixel";
import { getTags } from "@/app/actions/tags";
import { getStages } from "@/app/actions/stages";
import { getAIConfig } from "@/app/actions/aiConfig";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";
import { ManageTagsModal } from "@/components/modals/ManageTagsModal";
import { ManageStagesSection } from "@/components/settings/ManageStagesSection";
import { AIConfigForm } from "@/components/settings/AIConfigForm";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const [pixel, tags, stages, aiConfig] = await Promise.all([
    getPixel(),
    getTags(),
    getStages(),
    getAIConfig(),
  ]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-zinc-500">
          Gerencie seu Pixel do Facebook, IA, pipeline e tags
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Pixel do Facebook</h2>
          <p className="text-sm text-zinc-500">
            Configure o Pixel ID e o Access Token para enviar eventos de conversão.
          </p>
        </div>
        <FacebookPixelForm pixel={pixel} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Inteligência Artificial</h2>
          <p className="text-sm text-zinc-500">
            Configure como a IA responde no WhatsApp. Você pode personalizar o prompt, o nome da clínica e ativar respostas em áudio.
          </p>
        </div>
        <AIConfigForm config={aiConfig ?? { clinicName: "Sanas Clinic", systemPrompt: "", sendAudio: false, openaiKey: "" }} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Colunas do Pipeline</h2>
          <p className="text-sm text-zinc-500">
            Defina as etapas do funil e qual evento do Facebook cada coluna dispara ao receber um lead.
          </p>
        </div>
        <ManageStagesSection stages={stages} />
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">Etiquetas (Tags)</h2>
          <p className="text-sm text-zinc-500">
            Crie e gerencie as tags para classificar seus leads.
          </p>
        </div>
        <ManageTagsModal tags={tags} />
      </section>
    </div>
  );
}
