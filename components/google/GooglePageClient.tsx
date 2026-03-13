"use client";

import { useState } from "react";
import {
  MapPin, Star, Clock, Phone, Store, ExternalLink,
  MessageCircle, Globe, ChevronDown, ChevronUp,
  AlertTriangle, Settings, ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GoogleBusinessData } from "@/app/actions/googleBusiness";

type Props = {
  data: GoogleBusinessData | null;
  hasConfig: boolean;
  whatsappPhone: string | null;
  whatsappMsg: string | null;
};

export function GooglePageClient({ data, hasConfig, whatsappPhone, whatsappMsg }: Props) {
  if (!hasConfig) {
    return <EmptyState />;
  }

  if (data?.error) {
    return <ErrorState error={data.error} />;
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Header com nome e nota */}
      <BusinessHeader data={data} whatsappPhone={whatsappPhone} whatsappMsg={whatsappMsg} />

      {/* KPIs rápidos */}
      <QuickStats data={data} />

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna esquerda - Avaliações (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <ReviewsSection reviews={data.reviews} rating={data.rating} totalReviews={data.totalReviews} />
        </div>

        {/* Coluna direita - Info (1/3) */}
        <div className="space-y-4">
          <BusinessInfo data={data} />
          <OpeningHours hours={data.hours} openNow={data.openNow} />
          <WhatsAppCTA whatsappPhone={whatsappPhone} whatsappMsg={whatsappMsg} mapsUrl={data.mapsUrl} />
        </div>
      </div>

      {/* Fotos */}
      {data.photoUrls.length > 0 && <PhotosSection photos={data.photoUrls} />}
    </div>
  );
}

// ─── Empty State ───

function EmptyState() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="h-6 w-6 text-amber-500" /> Google Meu Negócio
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie a presença da sua clínica no Google
        </p>
      </div>
      <Card className="border-slate-100 rounded-2xl">
        <CardContent className="py-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
            <Store className="h-7 w-7 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Conecte seu Google Meu Negócio</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure a API Key e o Place ID em<br />
            <span className="font-medium text-indigo-600">Configurações → Google Meu Negócio</span>
            <br />para ver avaliações, fotos e informações do seu negócio.
          </p>
          <a
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Ir para Configurações
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Error State ───

function ErrorState({ error }: { error: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="h-6 w-6 text-amber-500" /> Google Meu Negócio
        </h1>
      </div>
      <Card className="border-red-100 bg-red-50/30 rounded-2xl">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Erro ao carregar dados do Google</p>
              <p className="text-xs text-red-600/80 mt-1 font-mono">{error}</p>
              <p className="text-xs text-red-600/60 mt-2">
                Verifique a API Key e o Place ID em{" "}
                <a href="/dashboard/settings" className="underline font-medium">Configurações</a>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Business Header ───

function BusinessHeader({
  data,
  whatsappPhone,
  whatsappMsg,
}: {
  data: GoogleBusinessData;
  whatsappPhone: string | null;
  whatsappMsg: string | null;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Store className="h-6 w-6 text-amber-500" />
          {data.name || "Google Meu Negócio"}
        </h1>
        {data.address && (
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {data.address}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {data.mapsUrl && (
          <a
            href={data.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Ver no Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {whatsappPhone && (
          <a
            href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMsg || "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Testar WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Quick Stats ───

function QuickStats({ data }: { data: GoogleBusinessData }) {
  const ratingColor =
    data.rating >= 4.5
      ? "text-emerald-600"
      : data.rating >= 4.0
        ? "text-amber-600"
        : data.rating >= 3.0
          ? "text-orange-600"
          : "text-red-600";

  const ratingBg =
    data.rating >= 4.5
      ? "bg-emerald-50"
      : data.rating >= 4.0
        ? "bg-amber-50"
        : data.rating >= 3.0
          ? "bg-orange-50"
          : "bg-red-50";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Nota */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Nota</p>
          <div className={`w-8 h-8 rounded-xl ${ratingBg} flex items-center justify-center`}>
            <Star className={`h-4 w-4 ${ratingColor}`} />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <p className={`text-2xl font-bold ${ratingColor}`}>{data.rating.toFixed(1)}</p>
          <p className="text-xs text-slate-400">/ 5</p>
        </div>
        <RatingStars rating={data.rating} size="sm" />
      </div>

      {/* Total avaliações */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avaliações</p>
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-violet-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{data.totalReviews}</p>
      </div>

      {/* Status */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Status</p>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${data.openNow ? "bg-emerald-50" : "bg-red-50"}`}>
            <Clock className={`h-4 w-4 ${data.openNow ? "text-emerald-600" : "text-red-500"}`} />
          </div>
        </div>
        <p className={`text-lg font-bold ${data.openNow ? "text-emerald-600" : "text-red-500"}`}>
          {data.openNow === null ? "—" : data.openNow ? "Aberto" : "Fechado"}
        </p>
      </div>

      {/* Fotos */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Fotos</p>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-indigo-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{data.photoUrls.length}</p>
      </div>
    </div>
  );
}

// ─── Rating Stars ───

function RatingStars({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${starSize} ${
            i <= Math.round(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Reviews Section ───

function ReviewsSection({
  reviews,
  rating,
  totalReviews,
}: {
  reviews: GoogleBusinessData["reviews"];
  rating: number;
  totalReviews: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleReviews = expanded ? reviews : reviews.slice(0, 3);

  // Rating distribution estimate
  const dist = estimateDistribution(rating, totalReviews);

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Avaliações</h2>
          <span className="text-xs text-slate-400">{totalReviews} avaliações no Google</span>
        </div>

        {/* Rating overview bar */}
        <div className="flex items-start gap-6">
          {/* Big rating */}
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">{rating.toFixed(1)}</p>
            <RatingStars rating={rating} />
            <p className="text-[10px] text-slate-400 mt-1">{totalReviews} total</p>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = dist[stars] || 0;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 w-3 text-right">{stars}</span>
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhuma avaliação disponível</p>
        ) : (
          <div className="space-y-3 pt-2">
            {visibleReviews.map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
          </div>
        )}

        {reviews.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 py-2 transition-colors"
          >
            {expanded ? (
              <>Mostrar menos <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Ver todas ({reviews.length}) <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCard({ review }: { review: GoogleBusinessData["reviews"][number] }) {
  const [showFull, setShowFull] = useState(false);
  const isLong = review.text.length > 200;

  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {review.authorPhoto ? (
            <img
              src={review.authorPhoto}
              alt={review.author}
              className="w-8 h-8 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-xs font-bold text-amber-700">
                {review.author.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-800">{review.author}</p>
            <p className="text-[10px] text-slate-400">{review.relativeTime}</p>
          </div>
        </div>
        <RatingStars rating={review.rating} size="sm" />
      </div>
      {review.text && (
        <div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isLong && !showFull ? review.text.slice(0, 200) + "..." : review.text}
          </p>
          {isLong && (
            <button
              onClick={() => setShowFull(!showFull)}
              className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 mt-1"
            >
              {showFull ? "Menos" : "Ler mais"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Business Info ───

function BusinessInfo({ data }: { data: GoogleBusinessData }) {
  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Informações</h2>

        {data.address && (
          <InfoRow icon={MapPin} label="Endereço" value={data.address} />
        )}
        {data.phone && (
          <InfoRow icon={Phone} label="Telefone" value={data.phone} />
        )}
        {data.website && (
          <div className="flex items-start gap-2.5">
            <Globe className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Site</p>
              <a
                href={data.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline break-all"
              >
                {data.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-700">{value}</p>
      </div>
    </div>
  );
}

// ─── Opening Hours ───

function OpeningHours({ hours, openNow }: { hours: string[]; openNow: boolean | null }) {
  const [expanded, setExpanded] = useState(false);

  if (hours.length === 0) return null;

  // Find today
  const todayIndex = new Date().getDay();
  // Google returns Monday first, JS getDay() is Sunday=0
  const googleDayIndex = todayIndex === 0 ? 6 : todayIndex - 1;
  const todayHours = hours[googleDayIndex] || hours[0];

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Horários</h2>
          {openNow !== null && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              openNow
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-500"
            }`}>
              {openNow ? "Aberto agora" : "Fechado"}
            </span>
          )}
        </div>

        {/* Today */}
        <div className="bg-amber-50/50 rounded-lg p-2.5">
          <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">Hoje</p>
          <p className="text-xs text-slate-700 font-medium mt-0.5">{todayHours}</p>
        </div>

        {/* All days */}
        {expanded && (
          <div className="space-y-1.5">
            {hours.map((h, i) => (
              <div
                key={i}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                  i === googleDayIndex ? "bg-amber-50/50 font-medium" : ""
                }`}
              >
                <span className="text-slate-600">{h.split(":")[0]}</span>
                <span className="text-slate-500">{h.split(": ").slice(1).join(": ")}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          {expanded ? (
            <>Ocultar <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Ver todos os horários <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      </CardContent>
    </Card>
  );
}

// ─── WhatsApp CTA ───

function WhatsAppCTA({
  whatsappPhone,
  whatsappMsg,
  mapsUrl,
}: {
  whatsappPhone: string | null;
  whatsappMsg: string | null;
  mapsUrl: string | null;
}) {
  return (
    <Card className="border-emerald-100 bg-emerald-50/30 rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-3">
        <h2 className="text-sm font-bold text-emerald-900">Conversão WhatsApp</h2>
        <p className="text-xs text-emerald-700/70 leading-relaxed">
          Quando clientes encontrarem você no Google, direcione para o WhatsApp.
          Configure a mensagem padrão nas Configurações.
        </p>
        {whatsappPhone ? (
          <div className="space-y-2">
            <a
              href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMsg || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-xs font-medium text-white hover:bg-emerald-600 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Testar Link do WhatsApp
            </a>
            <p className="text-[10px] text-emerald-600/60 text-center">
              Use este link no campo &quot;WhatsApp&quot; do seu perfil no Google
            </p>
          </div>
        ) : (
          <p className="text-[10px] text-emerald-600/60">
            Configure o WhatsApp Business em{" "}
            <a href="/dashboard/settings" className="underline font-medium">Configurações</a>{" "}
            para gerar o link.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Photos Section ───

function PhotosSection({ photos }: { photos: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? photos : photos.slice(0, 4);

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Fotos do Negócio</h2>
          <span className="text-xs text-slate-400">{photos.length} fotos</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {visible.map((url, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>
          ))}
        </div>
        {photos.length > 4 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 py-1 transition-colors"
          >
            {showAll ? (
              <>Mostrar menos <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Ver todas as fotos ({photos.length}) <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ───

function estimateDistribution(
  rating: number,
  total: number
): Record<number, number> {
  // Approximate distribution based on average rating
  // This is an estimate since the Places API doesn't give per-star counts
  if (total === 0) return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const distributions: Record<string, number[]> = {
    "5.0": [0.9, 0.08, 0.01, 0.005, 0.005],
    "4.5": [0.7, 0.2, 0.06, 0.02, 0.02],
    "4.0": [0.5, 0.3, 0.12, 0.04, 0.04],
    "3.5": [0.3, 0.25, 0.25, 0.1, 0.1],
    "3.0": [0.2, 0.2, 0.3, 0.15, 0.15],
    "2.5": [0.1, 0.15, 0.25, 0.25, 0.25],
    "2.0": [0.05, 0.1, 0.15, 0.3, 0.4],
  };

  const key = (Math.round(rating * 2) / 2).toFixed(1);
  const dist = distributions[key] || distributions["4.0"];

  return {
    5: Math.round(total * dist[0]),
    4: Math.round(total * dist[1]),
    3: Math.round(total * dist[2]),
    2: Math.round(total * dist[3]),
    1: Math.round(total * dist[4]),
  };
}
