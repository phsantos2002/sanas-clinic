"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";
import type { ActionResult } from "@/types";

// ─── Config ───

export async function getGoogleBusinessConfig() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.googleBusinessConfig.findUnique({ where: { userId: user.id } });
}

export async function saveGoogleBusinessConfig(data: {
  apiKey: string;
  placeId: string;
  whatsappMsg?: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Não autenticado" };

    await prisma.googleBusinessConfig.upsert({
      where: { userId: user.id },
      update: {
        apiKey: data.apiKey,
        placeId: data.placeId,
        whatsappMsg: data.whatsappMsg || null,
      },
      create: {
        userId: user.id,
        apiKey: data.apiKey,
        placeId: data.placeId,
        whatsappMsg: data.whatsappMsg || null,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Erro ao salvar configuração" };
  }
}

// ─── Types ───

export type GoogleReview = {
  author: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
};

export type GoogleBusinessData = {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  rating: number;
  totalReviews: number;
  openNow: boolean | null;
  hours: string[];
  reviews: GoogleReview[];
  photoUrls: string[];
  placeId: string;
  error?: string;
};

// ─── Fetch Business Data from Places API (New) ───

export async function getGoogleBusinessData(): Promise<GoogleBusinessData | null> {
  const config = await getGoogleBusinessConfig();
  if (!config) return null;

  try {
    const fieldMask = [
      "displayName",
      "formattedAddress",
      "nationalPhoneNumber",
      "websiteUri",
      "googleMapsUri",
      "rating",
      "userRatingCount",
      "currentOpeningHours",
      "reviews",
      "photos",
    ].join(",");

    const res = await fetch(
      `https://places.googleapis.com/v1/places/${config.placeId}?languageCode=pt-BR`,
      {
        headers: {
          "X-Goog-Api-Key": config.apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        next: { revalidate: 300 }, // cache 5 min
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `Erro ${res.status}`;
      return {
        name: "",
        address: "",
        phone: null,
        website: null,
        mapsUrl: null,
        rating: 0,
        totalReviews: 0,
        openNow: null,
        hours: [],
        reviews: [],
        photoUrls: [],
        placeId: config.placeId,
        error: msg,
      };
    }

    const data = await res.json();

    // Build photo URLs (up to 6)
    const photoUrls: string[] = [];
    if (data.photos) {
      for (const photo of data.photos.slice(0, 6)) {
        photoUrls.push(
          `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=600&key=${config.apiKey}`
        );
      }
    }

    // Map reviews
    const reviews: GoogleReview[] = (data.reviews || []).map(
      (r: {
        authorAttribution?: { displayName?: string; photoUri?: string };
        rating?: number;
        text?: { text?: string };
        relativePublishTimeDescription?: string;
        publishTime?: string;
      }) => ({
        author: r.authorAttribution?.displayName || "Anônimo",
        authorPhoto: r.authorAttribution?.photoUri || null,
        rating: r.rating || 0,
        text: r.text?.text || "",
        relativeTime: r.relativePublishTimeDescription || "",
        publishTime: r.publishTime || "",
      })
    );

    return {
      name: data.displayName?.text || "",
      address: data.formattedAddress || "",
      phone: data.nationalPhoneNumber || null,
      website: data.websiteUri || null,
      mapsUrl: data.googleMapsUri || null,
      rating: data.rating || 0,
      totalReviews: data.userRatingCount || 0,
      openNow: data.currentOpeningHours?.openNow ?? null,
      hours: data.currentOpeningHours?.weekdayDescriptions || [],
      reviews,
      photoUrls,
      placeId: config.placeId,
    };
  } catch (e) {
    return {
      name: "",
      address: "",
      phone: null,
      website: null,
      mapsUrl: null,
      rating: 0,
      totalReviews: 0,
      openNow: null,
      hours: [],
      reviews: [],
      photoUrls: [],
      placeId: config.placeId,
      error: e instanceof Error ? e.message : "Erro ao buscar dados",
    };
  }
}
