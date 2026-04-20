import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const rl = rateLimit(`upload:${user.id}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisicoes. Tente novamente em breve." },
      { status: 429 }
    );
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }

  // Validate file size (max 100MB)
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande. Maximo 100MB." }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo nao suportado" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Storage não configurado. Adicione BLOB_READ_WRITE_TOKEN nas envs da Vercel (Storage > Blob).",
      },
      { status: 503 }
    );
  }

  try {
    const ext = file.name.split(".").pop() || "bin";
    const blob = await put(`social/${user.id}/${Date.now()}.${ext}`, file, { access: "public" });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    const msg = error instanceof Error ? error.message : "Erro ao fazer upload";
    return NextResponse.json({ error: `Falha ao salvar no storage: ${msg}` }, { status: 500 });
  }
}
