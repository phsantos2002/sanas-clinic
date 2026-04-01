import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });

  const { messages, leadName } = await req.json();

  const aiConfig = await prisma.aIConfig.findUnique({ where: { userId: dbUser.id } });
  const apiKey = aiConfig?.openaiKey || aiConfig?.apiKey;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [
      "Ola! Como posso ajudar?",
      "Obrigado pelo contato! Vou verificar isso para voce.",
      "Posso agendar um horario para voce?",
    ]});
  }

  try {
    const systemPrompt = `Voce gera 3 sugestoes de resposta curtas para WhatsApp.
O atendente esta conversando com ${leadName || "um lead"}.
Clinica: ${aiConfig?.clinicName || "Clinica"}.
${aiConfig?.systemPrompt ? `Instrucoes: ${aiConfig.systemPrompt}` : ""}
Responda APENAS um JSON array com 3 strings. Cada sugestao deve ter no maximo 80 caracteres.
Responda em portugues brasileiro, tom ${(aiConfig?.brandIdentity as Record<string, string>)?.default_tone || "profissional"}.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: aiConfig?.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-5).map((m: { role: string; content: string }) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: "Gere 3 sugestoes de resposta curtas como JSON array." },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response
    const match = content.match(/\[[\s\S]*\]/);
    const suggestions = match ? JSON.parse(match[0]) : [];

    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch {
    return NextResponse.json({ suggestions: [
      "Ola! Como posso ajudar?",
      "Vou verificar isso para voce!",
      "Gostaria de agendar um horario?",
    ]});
  }
}
