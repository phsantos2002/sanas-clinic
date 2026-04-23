import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { setUazapiWebhook } from "@/services/whatsappUazapi";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/whatsapp/sync-webhook
 *
 * Atualiza o webhook configurado no Uazapi para apontar para o domínio atual
 * deste deployment. Útil quando o app foi renomeado ou movido entre URLs.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (!config?.uazapiServerUrl || !config?.uazapiInstanceToken) {
    return NextResponse.json({ error: "Uazapi não configurado" }, { status: 400 });
  }

  const reqUrl = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || reqUrl.origin;
  const webhookUrl = `${origin}/api/webhook/evolution`;

  const result = await setUazapiWebhook(
    config.uazapiServerUrl,
    config.uazapiInstanceToken,
    webhookUrl
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Falha ao configurar webhook" },
      { status: 502 }
    );
  }

  logAudit({
    userId: dbUser.id,
    action: "whatsapp.sync_webhook",
    metadata: { webhookUrl },
  }).catch(() => {});

  return NextResponse.json({ success: true, webhookUrl });
}
