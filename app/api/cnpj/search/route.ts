import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/user";

// Normalized shape used by the frontend + importFromCNPJ action.
export type CompanyResult = {
  cnpj: string; // 14 dígitos sem formatação
  corporateName: string; // razão social
  tradeName: string | null; // nome fantasia
  phone: string | null; // principal (E.164 simplificado, ex: 5511999999999)
  secondaryPhone: string | null;
  email: string | null;
  address: string; // resumo "rua, n - bairro, cidade/UF"
  fullAddress: {
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  cnae: { code: string; description: string } | null;
  size: string | null; // ME / EPP / DEMAIS
  openedAt: string | null; // ISO
  capital: number | null;
  isHead: boolean; // matriz
  simples: boolean;
  mei: boolean;
  legalNature: string | null;
  members: { name: string; role: string }[]; // QSA
  score: number; // 0-100 qualificação prévia local
};

type CnpjaAddress = {
  street?: string;
  number?: string;
  details?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type CnpjaPhone = { area?: string; number?: string; type?: string };

type CnpjaMember = {
  role?: { text?: string };
  person?: { name?: string; type?: string; age?: string };
};

type CnpjaOffice = {
  taxId?: string;
  head?: boolean;
  company?: {
    name?: string;
    size?: { acronym?: string; text?: string };
    equity?: number;
    nature?: { text?: string };
    simples?: { optant?: boolean; since?: string };
    simei?: { optant?: boolean; since?: string };
    members?: CnpjaMember[];
  };
  alias?: string;
  address?: CnpjaAddress;
  phones?: CnpjaPhone[];
  emails?: { address?: string }[];
  mainActivity?: { id?: number; text?: string };
  status?: { id?: number; text?: string };
  founded?: string;
};

function formatPhone(p?: CnpjaPhone): string | null {
  if (!p?.number) return null;
  const digits = [p.area, p.number].filter(Boolean).join("").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

function joinAddress(a?: CnpjaAddress): string {
  if (!a) return "";
  const parts = [
    [a.street, a.number].filter(Boolean).join(", "),
    a.district,
    [a.city, a.state].filter(Boolean).join("/"),
  ].filter(Boolean);
  return parts.join(" - ");
}

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Score prévio 0-100 — heurística local baseada nos dados disponíveis da Receita.
// Foco: empresas prontas para prospecção (contato presente, operando há um tempo, porte viável).
function scoreCompany(o: {
  phone: string | null;
  email: string | null;
  capital: number | null;
  openedAt: string | null;
  size: string | null;
  isHead: boolean;
  members: unknown[];
}): number {
  let s = 0;
  if (o.phone) s += 25;
  if (o.email) s += 25;
  if (o.isHead) s += 5;
  if (o.members.length > 0) s += 5;
  // Capital social (R$): até 10 pts
  if (o.capital != null) {
    if (o.capital >= 500_000) s += 10;
    else if (o.capital >= 100_000) s += 7;
    else if (o.capital >= 10_000) s += 4;
    else if (o.capital > 0) s += 2;
  }
  // Porte: até 10 pts (empresas maiores têm ticket maior normalmente)
  if (o.size === "DEMAIS") s += 10;
  else if (o.size === "EPP") s += 7;
  else if (o.size === "ME") s += 4;
  // Tempo de mercado — sweet spot 2-10 anos
  if (o.openedAt) {
    const years = (Date.now() - new Date(o.openedAt).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years >= 2 && years <= 10) s += 15;
    else if (years > 10 && years <= 25) s += 10;
    else if (years > 25) s += 5;
    else if (years >= 1) s += 8;
    else s += 4;
  }
  return Math.min(100, Math.max(0, Math.round(s)));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const apiKey = process.env.CNPJA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Ferramenta indisponível. O administrador precisa configurar a chave CNPJá (CNPJA_API_KEY).",
      },
      { status: 503 }
    );
  }

  let body: {
    cnaes?: string[]; // lista de subclasses 7 dígitos (multi-CNAE)
    cnae?: string; // fallback legado: 1 CNAE só
    state?: string; // UF
    cityIbgeCode?: string; // código IBGE (7 dígitos) — filtro server-side preciso
    city?: string; // fallback: nome (filtro local case-insensitive)
    district?: string; // bairro (filtro local)
    zipPrefix?: string; // CEP prefixo (ex: "01000" para 010xx-xxx)
    size?: string; // ME | EPP | DEMAIS
    foundedFrom?: string; // "YYYY-MM-DD" (data abertura >=)
    foundedTo?: string;
    equityMin?: number; // capital social mínimo (R$)
    equityMax?: number;
    simples?: "yes" | "no" | "any"; // opta pelo Simples Nacional
    mei?: "yes" | "no" | "any";
    onlyHead?: boolean; // só matriz
    ddd?: string; // código de área do telefone (ex: "11")
    requirePhone?: boolean;
    requireEmail?: boolean;
    maxResults?: number;
    token?: string; // paginação
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const cnaes = (body.cnaes && body.cnaes.length > 0 ? body.cnaes : body.cnae ? [body.cnae] : [])
    .map((c) => c.replace(/\D/g, ""))
    .filter((c) => c.length === 7);
  if (cnaes.length === 0 || !body.state) {
    return NextResponse.json(
      { error: "Ao menos 1 CNAE válido e UF são obrigatórios" },
      { status: 400 }
    );
  }

  // Pedimos mais itens à API quando há filtros aplicados localmente
  // (cidade por nome, bairro, CEP sem filtro server).
  const desired = Math.min(Math.max(body.maxResults ?? 20, 1), 50);
  const hasLocalFilter = !!(
    body.requirePhone ||
    body.requireEmail ||
    (body.city?.trim() && !body.cityIbgeCode) ||
    body.district?.trim()
  );
  const fetchLimit = hasLocalFilter ? Math.min(desired * 5, 100) : desired;

  // Schema da API CNPJá (office.search) usa sufixo `.in` para filtros "in set"
  // e `.gte`/`.lte` para ranges.
  const params = new URLSearchParams();
  params.set("mainActivity.id.in", cnaes.join(","));
  params.set("address.state.in", body.state.toUpperCase());
  if (body.cityIbgeCode) params.set("address.municipality.in", body.cityIbgeCode);
  if (body.zipPrefix) params.set("address.zip.gte", body.zipPrefix.padEnd(8, "0"));
  if (body.size) {
    // ME=1, EPP=3, DEMAIS=5 no schema IBGE/Receita
    const sizeMap: Record<string, string> = { ME: "1", EPP: "3", DEMAIS: "5" };
    if (sizeMap[body.size]) params.set("company.size.id.in", sizeMap[body.size]);
  }
  if (body.foundedFrom) params.set("founded.gte", body.foundedFrom);
  if (body.foundedTo) params.set("founded.lte", body.foundedTo);
  if (typeof body.equityMin === "number") params.set("company.equity.gte", String(body.equityMin));
  if (typeof body.equityMax === "number") params.set("company.equity.lte", String(body.equityMax));
  if (body.simples === "yes") params.set("company.simples.optant.eq", "true");
  if (body.simples === "no") params.set("company.simples.optant.eq", "false");
  if (body.mei === "yes") params.set("company.simei.optant.eq", "true");
  if (body.mei === "no") params.set("company.simei.optant.eq", "false");
  if (body.onlyHead) params.set("head.eq", "true");
  if (body.ddd) params.set("phones.area.in", body.ddd);
  params.set("limit", String(fetchLimit));
  if (body.token) params.set("token", body.token);

  const url = `https://api.cnpja.com/office?${params.toString()}`;

  try {
    const r = await fetch(url, {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      console.error("[CNPJá] API error:", r.status, text, "URL:", url);
      const msg =
        r.status === 401
          ? "Chave CNPJá inválida."
          : r.status === 429
            ? "Limite de requisições do plano CNPJá atingido. Tente mais tarde."
            : `Erro ${r.status} na API CNPJá.`;
      return NextResponse.json(
        {
          error: msg,
          detail: text.slice(0, 1000),
          sentUrl: url.replace(apiKey, "[REDACTED]"),
        },
        { status: 502 }
      );
    }

    const rawText = await r.text();
    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    // Tenta extrair a lista de vários paths possíveis:
    // array raw | { data } | { records } | { offices } | { results } | { items }
    const asArray = Array.isArray(data) ? (data as CnpjaOffice[]) : null;
    const candidate =
      asArray ??
      (data as { data?: CnpjaOffice[] })?.data ??
      (data as { records?: CnpjaOffice[] })?.records ??
      (data as { offices?: CnpjaOffice[] })?.offices ??
      (data as { results?: CnpjaOffice[] })?.results ??
      (data as { items?: CnpjaOffice[] })?.items ??
      null;
    const items: CnpjaOffice[] = Array.isArray(candidate) ? candidate : [];

    const normalized: CompanyResult[] = items.map((o) => {
      const phones = (o.phones ?? []).map(formatPhone).filter((p): p is string => !!p);
      const phone = phones[0] ?? null;
      const email = o.emails?.[0]?.address ?? null;
      const size = o.company?.size?.acronym ?? null;
      const capital = typeof o.company?.equity === "number" ? o.company.equity : null;
      const openedAt = o.founded ?? null;
      const isHead = o.head === true;
      const members = (o.company?.members ?? [])
        .map((m) => ({
          name: m.person?.name ?? "",
          role: m.role?.text ?? "",
        }))
        .filter((m) => m.name);
      return {
        cnpj: o.taxId ?? "",
        corporateName: o.company?.name ?? "Sem nome",
        tradeName: o.alias ?? null,
        phone,
        secondaryPhone: phones[1] ?? null,
        email,
        address: joinAddress(o.address),
        fullAddress: {
          street: o.address?.street ?? null,
          number: o.address?.number ?? null,
          complement: o.address?.details ?? null,
          district: o.address?.district ?? null,
          city: o.address?.city ?? null,
          state: o.address?.state ?? null,
          zipCode: o.address?.zip ?? null,
        },
        cnae: o.mainActivity
          ? { code: String(o.mainActivity.id ?? ""), description: o.mainActivity.text ?? "" }
          : null,
        size,
        openedAt,
        capital,
        isHead,
        simples: o.company?.simples?.optant === true,
        mei: o.company?.simei?.optant === true,
        legalNature: o.company?.nature?.text ?? null,
        members,
        score: scoreCompany({ phone, email, capital, openedAt, size, isHead, members }),
      };
    });

    // Filtros locais: cidade por nome (só quando sem IBGE code) e bairro.
    const cityNeedle = !body.cityIbgeCode && body.city ? normalizeText(body.city) : "";
    const districtNeedle = body.district ? normalizeText(body.district) : "";
    const filtered = normalized
      .filter((c) => {
        if (body.requirePhone && !c.phone) return false;
        if (body.requireEmail && !c.email) return false;
        if (cityNeedle) {
          const cityResp = normalizeText(c.fullAddress.city ?? "");
          if (!cityResp.includes(cityNeedle) && !cityNeedle.includes(cityResp)) return false;
        }
        if (districtNeedle) {
          const distResp = normalizeText(c.fullAddress.district ?? "");
          if (!distResp.includes(districtNeedle)) return false;
        }
        return true;
      })
      .sort((a, b) => b.score - a.score) // ordena por score desc
      .slice(0, desired);

    const nextToken =
      (data as { next?: { token?: string } })?.next?.token ??
      (data as { token?: string })?.token ??
      null;

    return NextResponse.json({
      results: filtered,
      total: filtered.length,
      rawTotal: normalized.length,
      filteredOut: normalized.length - filtered.length,
      nextToken,
      sampleCities: Array.from(
        new Set(normalized.map((n) => n.fullAddress.city).filter(Boolean))
      ).slice(0, 10),
      // Diagnóstico (útil enquanto a integração estabiliza)
      sentUrl: url.replace(apiKey, "[REDACTED]"),
      rawResponsePreview: normalized.length === 0 ? rawText.slice(0, 800) : undefined,
    });
  } catch (err) {
    console.error("[CNPJá] fetch error:", err);
    return NextResponse.json({ error: "Erro ao consultar CNPJá" }, { status: 500 });
  }
}
