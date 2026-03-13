import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { getAIConfig } from "@/app/actions/aiConfig";

export async function SystemStatus() {
  const [waConfig, aiConfig] = await Promise.all([
    getWhatsAppConfig(),
    getAIConfig(),
  ]);

  // System is "online" when WhatsApp + AI are configured
  const isOnline = !!waConfig && !!aiConfig;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${isOnline ? "text-emerald-600" : "text-slate-400"}`}>
      <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
      {isOnline ? "Online" : "Offline"}
    </div>
  );
}
