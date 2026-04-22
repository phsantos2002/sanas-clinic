import { NextRequest, NextResponse } from "next/server";

// Cache in-memory por UF (lifetime do container). A base IBGE só muda em censos.
const cacheByUf = new Map<string, { code: string; name: string }[]>();

type IbgeMunicipality = {
  id: number;
  nome: string;
};

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uf = (searchParams.get("uf") ?? "").toUpperCase();
  const q = normalizeText(searchParams.get("q") ?? "");

  if (!/^[A-Z]{2}$/.test(uf)) {
    return NextResponse.json({ error: "UF inválida" }, { status: 400 });
  }

  let list = cacheByUf.get(uf);
  if (!list) {
    try {
      const r = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
        { next: { revalidate: 60 * 60 * 24 * 30 } } // 30 dias de cache edge
      );
      if (!r.ok) {
        return NextResponse.json({ error: "IBGE indisponível" }, { status: 502 });
      }
      const raw: IbgeMunicipality[] = await r.json();
      list = raw.map((m) => ({ code: String(m.id), name: m.nome }));
      cacheByUf.set(uf, list);
    } catch {
      return NextResponse.json({ error: "Erro ao consultar IBGE" }, { status: 500 });
    }
  }

  const results = q
    ? list.filter((m) => normalizeText(m.name).includes(q)).slice(0, 50)
    : list.slice(0, 100);

  return NextResponse.json({ results });
}
