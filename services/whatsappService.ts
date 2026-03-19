/**
 * Abstração unificada para envio de mensagens WhatsApp.
 * Roteia automaticamente entre API Oficial e Evolution API
 * baseado no provider configurado no WhatsAppConfig.
 */

import { sendWhatsAppMessage } from "./whatsappCloud";
import { sendEvolutionMessage } from "./whatsappEvolution";

type WhatsAppConfig = {
  provider: string;
  // Official
  phoneNumberId: string;
  accessToken: string;
  // Evolution
  evolutionServerUrl: string | null;
  evolutionApiKey: string | null;
  evolutionInstanceName: string | null;
};

export async function sendMessage(
  config: WhatsAppConfig,
  to: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === "evolution") {
    if (!config.evolutionServerUrl || !config.evolutionApiKey || !config.evolutionInstanceName) {
      return { success: false, error: "Evolution API não configurada" };
    }
    return sendEvolutionMessage(
      {
        serverUrl: config.evolutionServerUrl,
        apiKey: config.evolutionApiKey,
        instanceName: config.evolutionInstanceName,
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
