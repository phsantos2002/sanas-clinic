import { getAIResponseConfig, saveAIResponseConfig } from "@/app/actions/aiResponseConfig";
import { AIResponseConfigForm } from "@/components/settings/AIResponseConfigForm";

export default async function AISettingsPage() {
  const config = await getAIResponseConfig();

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Configuracoes da IA no Chat</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Controle como a IA responde no WhatsApp — delays, filtros, follow-up e audio
          </p>
        </div>
        <AIResponseConfigForm initial={config} onSave={saveAIResponseConfig} />
      </div>
    </div>
  );
}
