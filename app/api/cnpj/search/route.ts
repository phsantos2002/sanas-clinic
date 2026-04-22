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

type CnpjaOffice = {
  taxId?: string;
  company?: {
    name?: string;
    size?: { acronym?: string; text?: string };
    equity?: number;
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
    cnae?: string; // subclasse 7 dígitos
    state?: string; // UF
    city?: string;
    size?: string; // ME | EPP | DEMAIS
    requirePhone?: boolean;
    requireEmail?: boolean;
    maxResults?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  if (!body.cnae || !body.state) {
    return NextResponse.json({ error: "CNAE e UF são obrigatórios" }, { status: 400 });
  }

  const limit = Math.min(Math.max(body.maxResults ?? 20, 1), 50);

  const params = new URLSearchParams();
  params.set("activities.id", body.cnae.replace(/\D/g, ""));
  params.set("address.state", body.state.toUpperCase());
  if (body.city?.trim()) params.set("address.city", body.city.trim());
  if (body.size) params.set("company.size.acronym", body.size);
  params.set("status.id", "2"); // ativas
  if (body.requirePhone) params.set("phones.0.exists", "true");
  if (body.requireEmail) params.set("emails.0.exists", "true");
  params.set("limit", String(limit));

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
      console.error("[CNPJá] API error:", r.status, text);
      const msg =
        r.status === 401
          ? "Chave CNPJá inválida."
          : r.status === 429
            ? "Limite de requisições do plano CNPJá atingido. Tente mais tarde."
            : `Erro ${r.status} na API CNPJá.`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data: unknown = await r.json();
    const items: CnpjaOffice[] = Array.isArray(data)
      ? (data as CnpjaOffice[])
      : Array.isArray((data as { data?: CnpjaOffice[] }).data)
        ? (data as { data: CnpjaOffice[] }).data
        : [];

    const normalized: CompanyResult[] = items.map((o) => {
      const phones = (o.phones ?? []).map(formatPhone).filter((p): p is string => !!p);
      return {
        cnpj: o.taxId ?? "",
        corporateName: o.company?.name ?? "Sem nome",
        tradeName: o.alias ?? null,
        phone: phones[0] ?? null,
        secondaryPhone: phones[1] ?? null,
        email: o.emails?.[0]?.address ?? null,
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
        size: o.company?.size?.acronym ?? null,
        openedAt: o.founded ?? null,
        capital: typeof o.company?.equity === "number" ? o.company.equity : null,
      };
    });

    // Filtros extras que podem não ser aplicáveis via query (defesa em profundidade).
    const filtered = normalized.filter((c) => {
      if (body.requirePhone && !c.phone) return false;
      if (body.requireEmail && !c.email) return false;
      return true;
    });

    return NextResponse.json({ results: filtered, total: filtered.length });
  } catch (err) {
    console.error("[CNPJá] fetch error:", err);
    return NextResponse.json({ error: "Erro ao consultar CNPJá" }, { status: 500 });
  }
}
