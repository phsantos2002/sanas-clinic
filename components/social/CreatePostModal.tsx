"use client";

import { useState, type ComponentType } from "react";
import { X, Image, Video, Layers, Clock } from "lucide-react";
import { createSocialPost } from "@/app/actions/social";
import { FileUpload } from "./FileUpload";

const MEDIA_TYPES = [
  { id: "image", label: "Post Unico", icon: Image },
  { id: "reels", label: "Reels / Video", icon: Video },
  { id: "carousel", label: "Carrossel", icon: Layers },
  { id: "story", label: "Story", icon: Clock },
];

type BrandIconProps = { className?: string };

function InstagramBrand({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#FDF497" />
          <stop offset="5%" stopColor="#FDF497" />
          <stop offset="45%" stopColor="#FD5949" />
          <stop offset="60%" stopColor="#D6249F" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-grad)" />
      <rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="17" cy="7" r="1" fill="#fff" />
    </svg>
  );
}

function FacebookBrand({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        d="M13.5 21.8v-7.5h2.5l.4-2.9h-2.9V9.5c0-.8.3-1.4 1.5-1.4h1.5V5.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.6v7.5c.5.1.9.1 1.4.1s.9 0 1.4-.1z"
        fill="#fff"
      />
    </svg>
  );
}

function YouTubeBrand({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="1" y="5" width="22" height="14" rx="4" fill="#FF0000" />
      <path d="M10 8.5v7l6-3.5z" fill="#fff" />
    </svg>
  );
}

function TikTokBrand({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path
        d="M16.2 3h-2.8v12.3c0 1.5-1.2 2.6-2.6 2.6-1.5 0-2.6-1.2-2.6-2.6 0-1.5 1.2-2.6 2.6-2.6.3 0 .5 0 .8.1v-2.9c-.3 0-.5-.1-.8-.1-3 0-5.4 2.4-5.4 5.4S7.7 20.7 10.8 20.7s5.4-2.4 5.4-5.4V9c.9.7 2.1 1.1 3.3 1.1V7.3c-1.9 0-3.3-1.4-3.3-3.3V3z"
        fill="#000"
      />
      <path
        d="M15 3h-2.6v12.3c0 1.5-1.2 2.6-2.6 2.6-.5 0-.9-.1-1.3-.3.5.9 1.5 1.5 2.6 1.5 1.5 0 2.6-1.2 2.6-2.6V6.5c.9.7 2.1 1.1 3.3 1.1V5.3c-1 0-2-.9-2-2.3z"
        fill="#25F4EE"
      />
      <path
        d="M16.2 3v.3c0 1.4.9 2.3 2 2.3v2.1C17 7.7 15.9 7.3 15 6.6V15.3c0 1.5-1.2 2.6-2.6 2.6-1.1 0-2.1-.6-2.6-1.5-.8-.5-1.3-1.4-1.3-2.4 0-1.5 1.2-2.6 2.6-2.6.3 0 .5 0 .8.1v-2.1c-2.7.3-4.7 2.6-4.7 5.3 0 1.7.8 3.2 2 4.1-.3-.5-.4-1.1-.4-1.7 0-1.5 1.2-2.6 2.6-2.6.3 0 .5 0 .8.1V9.5c.9.7 2.1 1.1 3.3 1.1V7.7c0 0 0 0 0 0V3h-.3z"
        fill="#FE2C55"
      />
    </svg>
  );
}

function LinkedInBrand({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#0A66C2" />
      <circle cx="7.3" cy="7.8" r="1.6" fill="#fff" />
      <rect x="5.9" y="10.2" width="2.8" height="8.5" fill="#fff" />
      <path
        d="M10.6 10.2h2.7v1.2c.4-.7 1.3-1.4 2.8-1.4 3 0 3.6 2 3.6 4.5v4.2h-2.8v-3.7c0-.9 0-2.1-1.3-2.1-1.3 0-1.5 1-1.5 2v3.8h-2.8v-8.5z"
        fill="#fff"
      />
    </svg>
  );
}

function GoogleBrand({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.7 19.8 8.1 22 12 22z"
        fill="#34A853"
      />
      <path
        d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1C2.4 8.8 2 10.4 2 12s.4 3.2 1.1 4.6L6.4 14z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 2.9 14.7 2 12 2 8.1 2 4.7 4.2 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"
        fill="#EA4335"
      />
    </svg>
  );
}

const PLATFORM_OPTIONS: {
  id: string;
  label: string;
  Icon: ComponentType<BrandIconProps>;
}[] = [
  { id: "instagram", label: "Instagram", Icon: InstagramBrand },
  { id: "facebook", label: "Facebook", Icon: FacebookBrand },
  { id: "youtube", label: "YouTube", Icon: YouTubeBrand },
  { id: "tiktok", label: "TikTok", Icon: TikTokBrand },
  { id: "linkedin", label: "LinkedIn", Icon: LinkedInBrand },
  { id: "google_business", label: "Google", Icon: GoogleBrand },
];

export function CreatePostModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [scheduledDate, setScheduledDate] = useState(defaultDate || "");
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [hashtags, setHashtags] = useState("");
  const [status, setStatus] = useState<"draft" | "scheduled">("scheduled");
  const [saving, setSaving] = useState(false);

  // Media state
  const [singleMediaUrl, setSingleMediaUrl] = useState<string | null>(null);
  const [carouselMediaUrls, setCarouselMediaUrls] = useState<string[]>([]);

  const togglePlatform = (id: string) => {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const getMediaUrls = (): string[] => {
    if (mediaType === "carousel") return carouselMediaUrls;
    if (singleMediaUrl) return [singleMediaUrl];
    return [];
  };

  const handleSubmit = async () => {
    if (!title.trim() && !caption.trim()) return;
    setSaving(true);

    const scheduledAt =
      status === "scheduled" && scheduledDate
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : undefined;

    const result = await createSocialPost({
      title: title.trim() || undefined,
      caption: caption.trim() || undefined,
      hashtags: hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean),
      mediaUrls: getMediaUrls(),
      mediaType,
      platforms,
      scheduledAt,
      status,
    });

    setSaving(false);
    if (result.success) {
      onCreated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Novo Post</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Media Type */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Tipo de conteudo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MEDIA_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setMediaType(type.id);
                    setSingleMediaUrl(null);
                    setCarouselMediaUrls([]);
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all ${
                    mediaType === type.id
                      ? "bg-indigo-50 text-indigo-700 border-2 border-indigo-200"
                      : "bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100"
                  }`}
                >
                  <type.icon className="h-5 w-5" />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Titulo (interno)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Promocao de Marco"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Media Upload - adapts per content type */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              {mediaType === "reels" ? "Video" : "Midia"}
            </label>

            {mediaType === "carousel" ? (
              <FileUpload
                mode="multi"
                accept="image/jpeg,image/png,image/webp"
                value={carouselMediaUrls}
                onChange={setCarouselMediaUrls}
                maxFiles={10}
                hint="Arraste 2-10 imagens para o carrossel"
              />
            ) : mediaType === "reels" ? (
              <FileUpload
                mode="single"
                accept="video/mp4,video/quicktime,video/webm"
                value={singleMediaUrl}
                onChange={(url) => setSingleMediaUrl(url)}
                hint="MP4, MOV ou WebM — max 60s para Reels, 3min para Feed"
                maxSizeMB={100}
              />
            ) : (
              <FileUpload
                mode="single"
                accept="image/jpeg,image/png,image/webp"
                value={singleMediaUrl}
                onChange={(url) => setSingleMediaUrl(url)}
                hint={
                  mediaType === "story"
                    ? "Imagem vertical 9:16 recomendada"
                    : "Imagem quadrada 1:1 ou 4:5 recomendada"
                }
              />
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Legenda</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda do post..."
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Hashtags</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marketing #socialmedia #promo"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Plataformas</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const selected = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      selected
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm"
                        : "bg-white text-slate-600 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p.Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setStatus("draft")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  status === "draft"
                    ? "bg-slate-100 text-slate-700"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                }`}
              >
                Rascunho
              </button>
              <button
                onClick={() => setStatus("scheduled")}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  status === "scheduled"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                }`}
              >
                Agendar
              </button>
            </div>

            {status === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Data</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Horario</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (!title.trim() && !caption.trim())}
            className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : status === "scheduled" ? "Agendar Post" : "Salvar Rascunho"}
          </button>
        </div>
      </div>
    </div>
  );
}
