import { logger } from "@/lib/logger";

/**
 * Evolution API v2 — provider não-oficial via Baileys.
 *
 * A Evolution roda como servidor à parte (Docker/VPS/Railway) mantendo a
 * conexão WebSocket persistente com o WhatsApp; este client fala REST com ela.
 * Autenticação: header `apikey` (chave global AUTHENTICATION_API_KEY do servidor).
 *
 * Campos reutilizados no WhatsAppConfig (mesmos do Uazapi):
 *   uazapiServerUrl   → URL do servidor Evolution
 *   uazapiInstanceToken → apikey global
 *   uazapiInstanceName  → nome da instância (sanas-<userId8>)
 */

const log = logger.child({ service: "whatsappEvolution" });

const TIMEOUT_MS = 20000;

async function evolutionRequest(
  serverUrl: string,
  apiKey: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${serverUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (data as { response?: { message?: unknown }; message?: unknown })?.response?.message ??
        (data as { message?: unknown })?.message ??
        `HTTP ${res.status}`;
      return { ok: false, status: res.status, data, error: String(message) };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    log.error("evolution_request_error", { path, err });
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "network error" };
  }
}

function extractQrBase64(data: unknown): string | undefined {
  const d = data as {
    qrcode?: { base64?: string };
    base64?: string;
  } | null;
  const raw = d?.qrcode?.base64 ?? d?.base64;
  if (!raw) return undefined;
  return raw.startsWith("data:") ? raw : `data:image/png;base64,${raw}`;
}

/** Cria a instância (idempotente: 403 "already in use" é tratado como sucesso). */
export async function createEvolutionInstance(
  serverUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ success: boolean; qrcode?: string; error?: string }> {
  const r = await evolutionRequest(serverUrl, apiKey, "POST", "/instance/create", {
    instanceName,
    qrcode: true,
    integration: "WHATSAPP-BAILEYS",
  });

  if (r.ok) return { success: true, qrcode: extractQrBase64(r.data) };

  // Já existe → segue o fluxo normal de connect
  if (r.status === 403 || /already in use|already exists/i.test(r.error ?? "")) {
    return { success: true };
  }
  return { success: false, error: r.error };
}

/** (Re)conecta e retorna o QR code para pareamento. */
export async function connectEvolutionInstance(
  serverUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ success: boolean; qrcode?: string; error?: string }> {
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "GET",
    `/instance/connect/${encodeURIComponent(instanceName)}`
  );
  if (!r.ok) return { success: false, error: r.error };
  return { success: true, qrcode: extractQrBase64(r.data) };
}

/** Estado da conexão: "open" = pareado e ativo. */
export async function getEvolutionState(
  serverUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ connected: boolean; state?: string; error?: string }> {
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "GET",
    `/instance/connectionState/${encodeURIComponent(instanceName)}`
  );
  if (!r.ok) return { connected: false, error: r.error };
  const state = (r.data as { instance?: { state?: string } })?.instance?.state;
  return { connected: state === "open", state };
}

/** Registra o webhook de mensagens recebidas apontando para o app. */
export async function setEvolutionWebhook(
  serverUrl: string,
  apiKey: string,
  instanceName: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "POST",
    `/webhook/set/${encodeURIComponent(instanceName)}`,
    {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: ["MESSAGES_UPSERT"],
      },
    }
  );
  return { success: r.ok, error: r.error };
}

/** Envia mensagem de texto. `to` em dígitos (5511999999999). */
export async function sendEvolutionMessage(
  serverUrl: string,
  apiKey: string,
  instanceName: string,
  to: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const number = to.replace(/\D/g, "");
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "POST",
    `/message/sendText/${encodeURIComponent(instanceName)}`,
    { number, text }
  );
  if (!r.ok) log.error("evolution_send_failed", { instanceName, error: r.error });
  return { ok: r.ok, error: r.error };
}

/** Envia mídia (imagem/vídeo/documento) a partir de uma URL pública. */
export async function sendEvolutionMedia(
  serverUrl: string,
  apiKey: string,
  instanceName: string,
  to: string,
  media: { mediatype: "image" | "video" | "document"; url: string; caption?: string; fileName?: string }
): Promise<{ ok: boolean; error?: string }> {
  const number = to.replace(/\D/g, "");
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "POST",
    `/message/sendMedia/${encodeURIComponent(instanceName)}`,
    {
      number,
      mediatype: media.mediatype,
      media: media.url,
      caption: media.caption ?? "",
      fileName: media.fileName ?? "arquivo",
    }
  );
  if (!r.ok) log.error("evolution_send_media_failed", { instanceName, error: r.error });
  return { ok: r.ok, error: r.error };
}

/** Envia áudio como nota de voz (PTT) a partir de uma URL pública. */
export async function sendEvolutionAudio(
  serverUrl: string,
  apiKey: string,
  instanceName: string,
  to: string,
  url: string
): Promise<{ ok: boolean; error?: string }> {
  const number = to.replace(/\D/g, "");
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "POST",
    `/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`,
    { number, audio: url }
  );
  if (!r.ok) log.error("evolution_send_audio_failed", { instanceName, error: r.error });
  return { ok: r.ok, error: r.error };
}

/** Desloga o WhatsApp da instância (mantém a instância p/ reparear). */
export async function logoutEvolutionInstance(
  serverUrl: string,
  apiKey: string,
  instanceName: string
): Promise<{ success: boolean; error?: string }> {
  const r = await evolutionRequest(
    serverUrl,
    apiKey,
    "DELETE",
    `/instance/logout/${encodeURIComponent(instanceName)}`
  );
  return { success: r.ok, error: r.error };
}
