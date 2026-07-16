/**
 * Abstração unificada para envio de mensagens WhatsApp.
 * Roteia automaticamente entre API Oficial, Evolution (Baileys) e Uazapi.
 */

import { sendWhatsAppMessage } from "./whatsappCloud";
import { sendUazapiMessage } from "./whatsappUazapi";
import { sendEvolutionMessage } from "./whatsappEvolution";

type WhatsAppConfig = {
  provider: string;
  // Official
  phoneNumberId: string;
  accessToken: string;
  // Não-oficial (campos compartilhados por Evolution e Uazapi)
  uazapiServerUrl: string | null;
  uazapiInstanceToken: string | null;
  uazapiInstanceName?: string | null;
};

export async function sendMessage(
  config: WhatsAppConfig,
  to: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === "evolution") {
    if (!config.uazapiServerUrl || !config.uazapiInstanceToken || !config.uazapiInstanceName) {
      return { success: false, error: "Evolution não configurado" };
    }
    const res = await sendEvolutionMessage(
      config.uazapiServerUrl,
      config.uazapiInstanceToken,
      config.uazapiInstanceName,
      to,
      text
    );
    return { success: res.ok, error: res.ok ? undefined : res.error };
  }

  if (config.provider === "uazapi") {
    if (!config.uazapiServerUrl || !config.uazapiInstanceToken) {
      return { success: false, error: "Uazapi não configurado" };
    }
    const res = await sendUazapiMessage(
      config.uazapiServerUrl,
      config.uazapiInstanceToken,
      to,
      text
    );
    return { success: res.ok, error: res.ok ? undefined : res.error };
  }

  // Default: API Oficial
  if (!config.phoneNumberId || !config.accessToken) {
    return { success: false, error: "API Oficial não configurada" };
  }
  return sendWhatsAppMessage(config.phoneNumberId, config.accessToken, to, text);
}
