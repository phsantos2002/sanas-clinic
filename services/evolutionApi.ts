const EVOLUTION_URL = process.env.EVOLUTION_API_URL ?? "";
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "";

function normalize(phone: string) {
  return phone.replace(/\D/g, "");
}

function headers() {
  return { "Content-Type": "application/json", apikey: EVOLUTION_KEY };
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) return;

  await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ number: normalize(phone), text }),
  });
}

export async function sendWhatsAppAudio(phone: string, audioBuffer: Buffer) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY || !EVOLUTION_INSTANCE) return;

  const base64 = audioBuffer.toString("base64");

  await fetch(`${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      number: normalize(phone),
      mediatype: "audio",
      mimetype: "audio/mpeg",
      media: base64,
      fileName: "resposta.mp3",
    }),
  });
}
