/**
 * Uazapi (uazapiGO v2) — WhatsApp API
 * Docs: https://docs.uazapi.com
 */

export type UazapiConfig = {
  serverUrl: string;    // ex: https://sanas.uazapi.com
  adminToken: string;   // admin token
  instanceToken: string; // instance token
};

// ─── Instance management ───

export async function createUazapiInstance(
  serverUrl: string,
  adminToken: string,
  instanceName: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/instance/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", admintoken: adminToken },
      body: JSON.stringify({ name: instanceName }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Uazapi] Erro ao criar instância:", res.status, err);
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { success: true, token: data.token };
  } catch (err) {
    console.error("[Uazapi] Falha ao criar instância:", err);
    return { success: false, error: "Erro de conexão com Uazapi" };
  }
}

export async function connectUazapiInstance(
  serverUrl: string,
  token: string,
): Promise<{ success: boolean; qrcode?: string; status?: string; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    const data = await res.json();
    return {
      success: true,
      qrcode: data.instance?.qrcode || undefined,
      status: data.instance?.status,
    };
  } catch (err) {
    console.error("[Uazapi] Falha ao conectar:", err);
    return { success: false, error: "Erro de conexão" };
  }
}

export async function getUazapiStatus(
  serverUrl: string,
  token: string,
): Promise<{ connected: boolean; status?: string; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/instance/status`, {
      method: "GET",
      headers: { token },
    });

    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const status = data.instance?.status ?? "disconnected";
    return { connected: status === "connected", status };
  } catch {
    return { connected: false, error: "Erro de conexão" };
  }
}

export async function disconnectUazapiInstance(
  serverUrl: string,
  token: string,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${serverUrl}/instance/disconnect`, {
      method: "POST",
      headers: { token },
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

export async function deleteUazapiInstance(
  serverUrl: string,
  token: string,
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${serverUrl}/instance`, {
      method: "DELETE",
      headers: { token },
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ─── Webhook ───

export async function setUazapiWebhook(
  serverUrl: string,
  token: string,
  webhookUrl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        events: ["messages", "connection"],
        excludeMessages: ["wasSentByApi"],
        addUrlEvents: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${err}` };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao configurar webhook" };
  }
}

// ─── Send messages ───

export async function sendUazapiMessage(
  serverUrl: string,
  token: string,
  to: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  const phone = to.replace(/\D/g, "");

  try {
    const res = await fetch(`${serverUrl}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: phone, text }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Uazapi] Erro ao enviar:", res.status, err);
      return { success: false, error: `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[Uazapi] Falha:", err);
    return { success: false, error: "Network error" };
  }
}

// ─── Sync: chats, messages, contacts, profile pics ───

export type UazapiChat = {
  id: string;
  wa_chatid: string;
  wa_contactName: string;
  wa_groupSubject?: string;
  wa_isGroup: boolean;
  wa_lastMsgTimestamp: number;
  wa_unreadCount: number;
  phone?: string;
  image?: string;
  imagePreview?: string;
};

export type UazapiMessage = {
  id: string;
  messageid: string;
  chatid: string;
  fromMe: boolean;
  text: string;
  messageTimestamp: number;
  messageType: string;
  sender: string;
};

export async function getUazapiChats(
  serverUrl: string,
  token: string,
  limit: number = 100,
  offset: number = 0,
): Promise<{ success: boolean; chats?: UazapiChat[]; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/chat/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({
        wa_isGroup: false,
        sort: "-wa_lastMsgTimestamp",
        limit,
        offset,
      }),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, chats: data.chats ?? data };
  } catch {
    return { success: false, error: "Erro ao buscar chats" };
  }
}

export async function getUazapiMessages(
  serverUrl: string,
  token: string,
  chatId: string,
  limit: number = 30,
  offset: number = 0,
): Promise<{ success: boolean; messages?: UazapiMessage[]; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/message/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ chatid: chatId, limit, offset }),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, messages: data.messages ?? data };
  } catch {
    return { success: false, error: "Erro ao buscar mensagens" };
  }
}

export async function getUazapiChatDetails(
  serverUrl: string,
  token: string,
  number: string,
): Promise<{ success: boolean; image?: string; name?: string; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}/chat/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ number: number.replace(/\D/g, ""), preview: true }),
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      image: data.imagePreview ?? data.image ?? undefined,
      name: data.wa_contactName ?? data.pushname ?? undefined,
    };
  } catch {
    return { success: false, error: "Erro ao buscar detalhes" };
  }
}
