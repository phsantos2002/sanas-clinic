"use client";

import { useState } from "react";
import { X, Image, Video, Layers, Clock } from "lucide-react";
import { toast } from "sonner";
import { createSocialPost } from "@/app/actions/social";
import { PLATFORM_OPTIONS } from "@/components/icons/PlatformLogos";
import { FileUpload } from "./FileUpload";

const MEDIA_TYPES = [
  { id: "image", label: "Post Unico", icon: Image },
  { id: "reels", label: "Reels / Video", icon: Video },
  { id: "carousel", label: "Carrossel", icon: Layers },
  { id: "story", label: "Story", icon: Clock },
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
    if (!title.trim() && !caption.trim()) {
      toast.error("Adicione ao menos um título ou legenda");
      return;
    }

    const urls = getMediaUrls();
    if (status === "scheduled" && urls.length === 0) {
      toast.error("Adicione a mídia antes de agendar o post");
      return;
    }
    if (mediaType === "carousel" && status === "scheduled" && urls.length < 2) {
      toast.error("Carrossel precisa de pelo menos 2 imagens");
      return;
    }
    if (status === "scheduled" && !scheduledDate) {
      toast.error("Selecione data de agendamento");
      return;
    }
    if (platforms.length === 0) {
      toast.error("Selecione ao menos uma plataforma");
      return;
    }

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
      mediaUrls: urls,
      mediaType,
      platforms,
      scheduledAt,
      status,
    });

    setSaving(false);
    if (result.success) {
      onCreated();
    } else {
      toast.error(result.error ?? "Erro ao criar post");
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
