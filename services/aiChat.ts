import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AIResponse = {
  reply: string;
  newStageEventName: string | null;
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

export async function generateAIReply(
  messages: ChatMessage[],
  leadName: string,
  config?: { clinicName?: string; systemPrompt?: string | null }
): Promise<AIResponse> {
  const clinicName = config?.clinicName ?? "Sanas Clinic";
  const systemPrompt = buildSystemPrompt(clinicName, config?.systemPrompt);
  const systemWithName = `${systemPrompt}\n\nNome do lead atual: ${leadName}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: systemWithName,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const fullText =
    response.content[0].type === "text" ? response.content[0].text : "";

  const stageMatch = fullText.match(/STAGE:\s*(\w+)/);
  const newStageEventName = stageMatch ? stageMatch[1] : null;
  const reply = fullText.replace(/\n?STAGE:\s*\w+\n?/g, "").trim();

  return { reply, newStageEventName };
}
