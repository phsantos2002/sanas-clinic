/**
 * WAHA (WhatsApp HTTP API) — WhatsApp connection via QR Code
 * Docs: https://waha.devlike.pro/docs/overview/introduction/
 *
 * Free CORE tier: sessions, QR code, send/receive messages, webhooks.
 */

export type WahaConfig = {
  serverUrl: string;   // ex: http://localhost:3008
  apiKey: string;      // WHATSAPP_API_KEY do WAHA
  sessionName: string;
};

function headers(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
  };
}

// ─── Session management ───

export async function createWahaSession(
  serverUrl: string,
  apiKey: string,
  sessionName: string,
  webhookUrl?: string,
): Promise<{ success: boolean; qrcode?: string; error?: string }> {
  try {
    // Create + start session in one call
    const body: Record<string, unknown> = {
      name: sessionName,
      start: true,
      config: {
        webhooks: webhookUrl
          ? [{ url: webhookUrl, events: ["message"] }]
          : [],
      },
    };

    const res = await fetch(`${serverUrl}/api/sessions`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      // Session already exists — just start it
      if (res.status === 422 || err.includes("already exists")) {
        await startWahaSession({ serverUrl, apiKey, sessionName });
        // Fetch QR after starting
        const qr = await getWahaQRCode({ serverUrl, apiKey, sessionName });
        return { success: true, qrcode: qr.qrcode };
      }
      console.error("[WAHA] Erro ao criar sessão:", res.status, err);
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    // Give WAHA a moment to initialize the session
    await new Promise((r) => setTimeout(r, 2000));

    // Fetch QR code
    const qr = await getWahaQRCode({ serverUrl, apiKey, sessionName });
    return { success: true, qrcode: qr.qrcode };
  } catch (err) {
    console.error("[WAHA] Falha ao criar sessão:", err);
    return { success: false, error: "Erro de conexão com o servidor WAHA" };
  }
}

export async function startWahaSession(
  config: WahaConfig,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/api/sessions/${config.sessionName}/start`,
      {
        method: "POST",
        headers: headers(config.apiKey),
      },
    );
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

export async function getWahaQRCode(
  config: WahaConfig,
): Promise<{ success: boolean; qrcode?: string; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/api/${config.sessionName}/auth/qr?format=image`,
      {
        method: "GET",
        headers: { "X-Api-Key": config.apiKey },
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[WAHA] QR response error:", res.status, err);
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    // format=image returns a PNG image — convert to base64 data URI
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUri = `data:image/png;base64,${base64}`;

    return { success: true, qrcode: dataUri };
  } catch (err) {
    console.error("[WAHA] Falha ao obter QR Code:", err);
    return { success: false, error: "Erro ao obter QR Code" };
  }
}

export async function getWahaConnectionStatus(
  config: WahaConfig,
): Promise<{ connected: boolean; state?: string; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/api/sessions/${config.sessionName}`,
      {
        method: "GET",
        headers: headers(config.apiKey),
      },
    );

    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    // WAHA session statuses: WORKING, SCAN_QR_CODE, STARTING, STOPPED, FAILED
    const status = data?.status ?? "STOPPED";
    return { connected: status === "WORKING", state: status };
  } catch {
    return { connected: false, error: "Erro de conexão" };
  }
}

export async function deleteWahaSession(
  config: WahaConfig,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/api/sessions/${config.sessionName}`,
      {
        method: "DELETE",
        headers: headers(config.apiKey),
      },
    );

    return { success: res.ok };
  } catch {
    return { success: false, error: "Erro ao deletar sessão" };
  }
}

// ─── Set webhook on existing session ───

export async function setWahaWebhook(
  config: WahaConfig,
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${config.serverUrl}/api/sessions/${config.sessionName}`,
      {
        method: "PUT",
        headers: headers(config.apiKey),
        body: JSON.stringify({
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: ["message"],
              },
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

export async function sendWahaMessage(
  config: WahaConfig,
  to: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  const phone = to.replace(/\D/g, "");

  try {
    const res = await fetch(
      `${config.serverUrl}/api/sendText`,
      {
        method: "POST",
        headers: headers(config.apiKey),
        body: JSON.stringify({
          session: config.sessionName,
          chatId: `${phone}@c.us`,
          text,
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[WAHA] Erro ao enviar mensagem:", res.status, err);
      return { success: false, error: `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[WAHA] Falha na requisição:", err);
    return { success: false, error: "Network error" };
  }
}
