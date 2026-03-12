import { getWhatsAppConfig } from "@/app/actions/whatsapp";

export async function WhatsAppStatus() {
  const config = await getWhatsAppConfig();

  if (!config) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-zinc-300" />
        WhatsApp não configurado
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      WhatsApp Conectado
    </div>
  );
}
