import { getAIResponseConfig, saveAIResponseConfig } from "@/app/actions/aiResponseConfig";
import { getAIConfig } from "@/app/actions/aiConfig";
import { AIResponseConfigForm } from "@/components/settings/AIResponseConfigForm";
import { AIConfigForm } from "@/components/settings/AIConfigForm";

export default async function AISettingsPage() {
  const [responseConfig, aiConfig] = await Promise.all([getAIResponseConfig(), getAIConfig()]);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* AI Provider (OpenAI / Gemini) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Provider de IA</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Escolha o modelo, API key, nome da clinica e prompt personalizado
          </p>
        </div>
        <AIConfigForm
          config={
            aiConfig ?? {
              clinicName: "Sanas Pulse",
              systemPrompt: "",
              sendAudio: false,
              provider: "openai",
              model: "gpt-4o-mini",
              capabilities: "text",
              apiKey: "",
              voiceClonePrompt: "",
              openaiKey: "",
            }
          }
        />
      </div>

      {/* AI Response Config (delays, filters, etc) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Comportamento da IA no Chat</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Controle delays, filtros, follow-up e audio da IA no WhatsApp
          </p>
        </div>
        <AIResponseConfigForm initial={responseConfig} onSave={saveAIResponseConfig} />
      </div>
    </div>
  );
}
