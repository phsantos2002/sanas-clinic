/**
 * Uazapi — envio de mensagens via variáveis de ambiente.
 * Usado por processos que não têm config do banco.
 */

const UAZAPI_URL = process.env.UAZAPI_SERVER_URL ?? "";
const UAZAPI_TOKEN = process.env.UAZAPI_INSTANCE_TOKEN ?? "";

function normalize(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!UAZAPI_URL || !UAZAPI_TOKEN) return;

  await fetch(`${UAZAPI_URL}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
    body: JSON.stringify({ number: normalize(phone), text }),
  });
}

export async function sendWhatsAppAudio(phone: string, audioBuffer: Buffer) {
  if (!UAZAPI_URL || !UAZAPI_TOKEN) return;

  const base64 = audioBuffer.toString("base64");

  await fetch(`${UAZAPI_URL}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
    body: JSON.stringify({
      number: normalize(phone),
      type: "ptt",
      file: `data:audio/mpeg;base64,${base64}`,
    }),
  });
}
