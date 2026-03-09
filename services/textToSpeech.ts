import OpenAI from "openai";

export async function generateAudio(text: string, apiKey: string): Promise<Buffer | null> {
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova", // Voz feminina, natural em português
      input: text,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[TTS]", err);
    return null;
  }
}
