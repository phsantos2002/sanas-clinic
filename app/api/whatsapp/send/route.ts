import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (!config || config.provider !== "uazapi" || !config.uazapiServerUrl || !config.uazapiInstanceToken) {
    return NextResponse.json({ error: "Uazapi não configurado" }, { status: 400 });
  }

  const body = await req.json();
  const { number, text } = body;

  if (!number || !text) {
    return NextResponse.json({ error: "number e text são obrigatórios" }, { status: 400 });
  }

  try {
    const res = await fetch(`${config.uazapiServerUrl}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: config.uazapiInstanceToken },
      body: JSON.stringify({ number: number.replace(/\D/g, ""), text }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    // Also save to local DB if lead exists
    const phone = number.replace(/\D/g, "");
    const lead = await prisma.lead.findFirst({
      where: { userId: dbUser.id, phone: { endsWith: phone.slice(-9) } },
    });

    if (lead) {
      await prisma.message.create({
        data: { leadId: lead.id, role: "assistant", content: text },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[whatsapp send]", err);
    return NextResponse.json({ error: "Erro ao enviar" }, { status: 500 });
  }
}
