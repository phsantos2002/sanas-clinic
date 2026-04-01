import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });

  const { objective, tone } = await req.json();
  if (!objective) return NextResponse.json({ error: "Objetivo obrigatorio" }, { status: 400 });

  const aiConfig = await prisma.aIConfig.findUnique({ where: { userId: dbUser.id } });
  const apiKey = aiConfig?.openaiKey || aiConfig?.apiKey;
  if (!apiKey) return NextResponse.json({ error: "API key nao configurada" }, { status: 400 });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: aiConfig?.model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Voce cria templates de mensagem WhatsApp para negocios brasileiros.
Clinica: ${aiConfig?.clinicName || "Negocio"}.
Tom: ${tone || "profissional"}.
Use variaveis dinamicas: {{nome}} para o nome do lead, {{clinica}} para o nome do negocio.
Responda APENAS o texto do template, sem aspas nem explicacoes. Maximo 300 caracteres.`,
          },
          { role: "user", content: `Crie um template de WhatsApp para: ${objective}` },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    const data = await res.json();
    const template = data.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar template" }, { status: 500 });
  }
}
