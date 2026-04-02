import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { getAIConfig } from "@/app/actions/aiConfig";

export async function SystemStatus() {
  const [waConfig, aiConfig] = await Promise.all([
    getWhatsAppConfig(),
    getAIConfig(),
  ]);

  const hasWhatsApp = !!(waConfig?.uazapiInstanceToken || waConfig?.accessToken);
  const hasAI = !!aiConfig;

  // Online if at least one integration is configured
  const isOnline = hasWhatsApp || hasAI;

  const label = hasWhatsApp && hasAI
    ? "Online"
    : hasWhatsApp
      ? "WhatsApp"
      : hasAI
        ? "IA ativa"
        : "Configurar";

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isOnline ? "text-emerald-600" : "text-slate-400"}`}>
      <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-300"}`} />
      {label}
    </div>
  );
}
