/**
 * WAHA API — envio de mensagens via variáveis de ambiente.
 * Usado pelo webhook e processos que não têm config do banco.
 */

const WAHA_URL = process.env.WAHA_SERVER_URL ?? "";
const WAHA_KEY = process.env.WAHA_API_KEY ?? "";
const WAHA_SESSION = process.env.WAHA_SESSION ?? "default";

function normalize(phone: string) {
  return phone.replace(/\D/g, "");
}

function headers() {
  return { "Content-Type": "application/json", "X-Api-Key": WAHA_KEY };
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!WAHA_URL || !WAHA_KEY) return;

  await fetch(`${WAHA_URL}/api/sendText`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId: `${normalize(phone)}@c.us`,
      text,
    }),
  });
}

export async function sendWhatsAppAudio(phone: string, audioBuffer: Buffer) {
  if (!WAHA_URL || !WAHA_KEY) return;

  const base64 = audioBuffer.toString("base64");

  await fetch(`${WAHA_URL}/api/sendFile`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId: `${normalize(phone)}@c.us`,
      file: {
        mimetype: "audio/mpeg",
        filename: "resposta.mp3",
        data: base64,
      },
    }),
  });
}
