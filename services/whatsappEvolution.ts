/**
 * Evolution API v2 — WhatsApp connection via QR Code
 * Docs: https://doc.evolution-api.com
 */

type EvolutionConfig = {
  serverUrl: string;   // ex: https://evo.meudominio.com
  apiKey: string;      // API Key global
  instanceName: string;
};

// ─── Instance management ───

export async function createEvolutionInstance(
  serverUrl: string,
  apiKey: string,
  instanceName: string,
): Promise<{ success: boolean; instanceId?: string; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Evolution] Erro ao criar instância:", res.status, err);
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      instanceId: data?.instance?.instanceId ?? data?.instanceId ?? instanceName,
    };
  } catch (err) {
    console.error("[Evolution] Falha ao criar instância:", err);
    return { success: false, error: "Erro de conexão com o servidor Evolution" };
  }
}

export async function restartEvolutionInstance(
  config: EvolutionConfig,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/instance/restart/${config.instanceName}`,
      {
        method: "PUT",
        headers: { apikey: config.apiKey },
      },
    );
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

export async function getEvolutionQRCode(
  config: EvolutionConfig,
): Promise<{ success: boolean; qrcode?: string; error?: string }> {
  try {
    // Restart instance to force a fresh QR code generation
    await restartEvolutionInstance(config);
    // Small delay to let the instance restart
    await new Promise((r) => setTimeout(r, 2000));

    const res = await fetch(
      `${config.serverUrl}/instance/connect/${config.instanceName}`,
      {
        method: "GET",
        headers: { apikey: config.apiKey },
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Evolution] QR response error:", res.status, err);
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await res.json();
    console.log("[Evolution] QR full response:", JSON.stringify(data).slice(0, 500));

    // Evolution v2 pode retornar em diferentes formatos
    const qrcode =
      data?.base64 ??
      data?.qrcode?.base64 ??
      data?.qrcode ??
      data?.code ??
      data?.pairingCode ??
      null;

    // Se o qrcode for um objeto, tenta extrair base64 dele
    const qrString = typeof qrcode === "string" ? qrcode : null;

    return {
      success: true,
      qrcode: qrString ?? undefined,
    };
  } catch (err) {
    console.error("[Evolution] Falha ao obter QR Code:", err);
    return { success: false, error: "Erro ao obter QR Code" };
  }
}

export async function getEvolutionConnectionStatus(
  config: EvolutionConfig,
): Promise<{ connected: boolean; state?: string; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/instance/connectionState/${config.instanceName}`,
      {
        method: "GET",
        headers: { apikey: config.apiKey },
      },
    );

    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const state = data?.instance?.state ?? data?.state ?? "close";
    return { connected: state === "open", state };
  } catch {
    return { connected: false, error: "Erro de conexão" };
  }
}

export async function deleteEvolutionInstance(
  config: EvolutionConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/instance/delete/${config.instanceName}`,
      {
        method: "DELETE",
        headers: { apikey: config.apiKey },
      },
    );

    return { success: res.ok };
  } catch {
    return { success: false, error: "Erro ao deletar instância" };
  }
}

// ─── Set webhook URL on the instance ───

export async function setEvolutionWebhook(
  config: EvolutionConfig,
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/webhook/set/${config.instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.apiKey,
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            events: [
              "MESSAGES_UPSERT",
            ],
          },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao configurar webhook" };
  }
}

// ─── Send message ───

export async function sendEvolutionMessage(
  config: EvolutionConfig,
  to: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  const phone = to.replace(/\D/g, "");

  try {
    const res = await fetch(
      `${config.serverUrl}/message/sendText/${config.instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.apiKey,
        },
        body: JSON.stringify({
          number: phone,
          text,
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Evolution] Erro ao enviar mensagem:", res.status, err);
      return { success: false, error: `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[Evolution] Falha na requisição:", err);
    return { success: false, error: "Network error" };
  }
}
