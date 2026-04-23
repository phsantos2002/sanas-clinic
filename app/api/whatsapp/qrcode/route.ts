import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { connectUazapiInstance, getUazapiStatus } from "@/services/whatsappUazapi";

/**
 * GET /api/whatsapp/qrcode
 *
 * Triggers the Uazapi instance to (re)connect and returns the QR code (base64
 * data URL) that the user must scan with the WhatsApp app to pair.
 *
 * Response shape:
 *   { state: "connected" | "qr" | "connecting" | "error", qrcode?: string, status?: string, error?: string }
 *
 * If already connected, no QR is returned — caller should poll status.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const config = await prisma.whatsAppConfig.findUnique({ where: { userId: dbUser.id } });
  if (
    !config ||
    config.provider !== "uazapi" ||
    !config.uazapiServerUrl ||
    !config.uazapiInstanceToken
  ) {
    return NextResponse.json({ error: "Uazapi não configurado" }, { status: 400 });
  }

  // First check if already connected — saves a /connect call
  const status = await getUazapiStatus(config.uazapiServerUrl, config.uazapiInstanceToken);
  if (status.connected) {
    return NextResponse.json({
      state: "connected",
      status: status.status,
      phone: status.phone,
      name: status.name,
    });
  }

  const result = await connectUazapiInstance(config.uazapiServerUrl, config.uazapiInstanceToken);
  if (!result.success) {
    return NextResponse.json(
      { state: "error", error: result.error ?? "Falha ao iniciar conexão" },
      { status: 502 }
    );
  }

  // Uazapi returns the QR as base64 in result.qrcode when status is "qr"
  return NextResponse.json({
    state: result.qrcode ? "qr" : "connecting",
    qrcode: result.qrcode,
    status: result.status,
  });
}
