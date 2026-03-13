import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AIResponse = {
  reply: string;
  newStageEventName: string | null;
};

export type AIProviderConfig = {
  provider: string;   // "openai" | "gemini"
  model: string;
  apiKey: string;
  clinicName?: string;
  systemPrompt?: string | null;
};

const BASE_INSTRUCTIONS = `
Ao final de cada resposta, você DEVE incluir uma linha separada com o estágio atual da conversa no formato:
STAGE: <nome_do_estagio>

Os estágios possíveis são:
- STAGE: Lead (primeiro contato, ainda não conversou)
- STAGE: Contact (está conversando, respondeu)
- STAGE: QualifiedLead (demonstrou interesse claro, informou o que quer)
- STAGE: Schedule (quer agendar ou está agendando)
- STAGE: Purchase (agendamento confirmado / pagamento feito)

Responda SEMPRE em português brasileiro. Respostas curtas e diretas.`;

function buildSystemPrompt(clinicName: string, customPrompt?: string | null): string {
  const base = customPrompt?.trim()
    ? customPrompt.trim()
    : `Você é uma assistente virtual de atendimento da ${clinicName}, uma clínica de estética.
Seu papel é atender leads (potenciais clientes) que chegam via WhatsApp de forma amigável, profissional e objetiva.

Seus objetivos em ordem:
1. Cumprimentar e entender o interesse do lead
2. Apresentar os serviços da clínica
3. Qualificar o lead (entender qual procedimento interessa, quando pode vir, etc)
4. Converter para agendamento
5. Confirmar o agendamento`;

  return base + BASE_INSTRUCTIONS;
}

const MAX_HISTORY_MESSAGES = 20;

function parseResponse(fullText: string): AIResponse {
  const stageMatch = fullText.match(/STAGE:\s*(\w+)/);
  const newStageEventName = stageMatch ? stageMatch[1] : null;
  const reply = fullText.replace(/\n?STAGE:\s*\w+\n?/g, "").trim();
  return { reply, newStageEventName };
}

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model,
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

async function generateWithGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const genModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);

  return result.response.text();
}

export async function generateAIReply(
  messages: ChatMessage[],
  leadName: string,
  config: AIProviderConfig,
): Promise<AIResponse> {
  const clinicName = config.clinicName ?? "Sanas Clinic";
  const systemPrompt = buildSystemPrompt(clinicName, config.systemPrompt);
  const systemWithName = `${systemPrompt}\n\nNome do lead atual: ${leadName}`;

  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  try {
    let fullText: string;

    if (config.provider === "gemini") {
      fullText = await generateWithGemini(config.apiKey, config.model, systemWithName, recentMessages);
    } else {
      fullText = await generateWithOpenAI(config.apiKey, config.model, systemWithName, recentMessages);
    }

    return parseResponse(fullText);
  } catch (err) {
    console.error("[AI] Erro ao gerar resposta:", err);
    return {
      reply: `Olá! No momento não consegui processar sua mensagem automaticamente. Um atendente da ${clinicName} vai te responder em breve!`,
      newStageEventName: null,
    };
  }
}
