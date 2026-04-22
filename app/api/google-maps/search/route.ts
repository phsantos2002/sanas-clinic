import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/app/actions/user";

type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  mapsUrl: string | null;
  types: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  types?: string[];
  businessStatus?: string;
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Ferramenta indisponível. O administrador do sistema precisa configurar a chave Google Places.",
      },
      { status: 503 }
    );
  }

  let body: {
    query?: string;
    city?: string;
    minRating?: number;
    requireWebsite?: boolean;
    requirePhone?: boolean;
    excludeRated?: boolean;
    maxResults?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const textQuery = [body.query?.trim(), body.city?.trim()].filter(Boolean).join(" em ");
  if (!textQuery) {
    return NextResponse.json({ error: "Informe o que buscar (ex: dentistas)" }, { status: 400 });
  }

  const maxResults = Math.min(Math.max(body.maxResults ?? 20, 1), 20);

  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.types,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery,
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: maxResults,
        ...(body.minRating ? { minRating: body.minRating } : {}),
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("[GoogleMaps] Places API error:", r.status, text);
      return NextResponse.json(
        { error: `Erro na busca (${r.status}). Verifique a chave Google Places.` },
        { status: 502 }
      );
    }

    const data: { places?: GooglePlace[] } = await r.json();
    const places = data.places ?? [];

    const normalized: PlaceResult[] = places
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map((p) => ({
        placeId: p.id ?? "",
        name: p.displayName?.text ?? "Sem nome",
        address: p.formattedAddress ?? "",
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        rating: typeof p.rating === "number" ? p.rating : null,
        reviews: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
        mapsUrl: p.googleMapsUri ?? null,
        types: p.types ?? [],
      }))
      .filter((p) => {
        if (body.requirePhone && !p.phone) return false;
        if (body.requireWebsite && !p.website) return false;
        if (body.excludeRated && p.rating && p.reviews && p.reviews >= 5) return false;
        return true;
      });

    return NextResponse.json({ results: normalized, total: normalized.length });
  } catch (err) {
    console.error("[GoogleMaps] fetch error:", err);
    return NextResponse.json({ error: "Erro ao consultar Google Places" }, { status: 500 });
  }
}
