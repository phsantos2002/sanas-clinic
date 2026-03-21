/**
 * Abstração unificada para envio de mensagens WhatsApp.
 * Roteia automaticamente entre API Oficial e WAHA
 * baseado no provider configurado no WhatsAppConfig.
 */

import { sendWhatsAppMessage } from "./whatsappCloud";
import { sendWahaMessage } from "./whatsappEvolution";

type WhatsAppConfig = {
  provider: string;
  // Official
  phoneNumberId: string;
  accessToken: string;
  // WAHA
  wahaServerUrl: string | null;
  wahaApiKey: string | null;
  wahaSessionName: string | null;
};

export async function sendMessage(
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === "waha") {
    if (!config.wahaServerUrl || !config.wahaApiKey || !config.wahaSessionName) {
      return { success: false, error: "WAHA não configurado" };
    }
    return sendWahaMessage(
      {
        serverUrl: config.wahaServerUrl,
        apiKey: config.wahaApiKey,
        sessionName: config.wahaSessionName,
      },
      to,
      text,
    );
  }

  // Default: API Oficial
  if (!config.phoneNumberId || !config.accessToken) {
    return { success: false, error: "API Oficial não configurada" };
  }
  return sendWhatsAppMessage(config.phoneNumberId, config.accessToken, to, text);
}
