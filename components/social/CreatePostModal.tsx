"use client";

import { useState } from "react";
import { X, Image, Video, Layers, Clock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createSocialPost, updateSocialPost } from "@/app/actions/social";
import type { SocialPostData } from "@/app/actions/social";
import { PLATFORM_OPTIONS } from "@/components/icons/PlatformLogos";
import { FileUpload } from "./FileUpload";
import { PostPreviewer } from "./PostPreviewer";

const MEDIA_TYPES = [
  { id: "image", label: "Post Unico", icon: Image },
  { id: "reels", label: "Reels / Video", icon: Video },
  { id: "carousel", label: "Carrossel", icon: Layers },
  { id: "story", label: "Story", icon: Clock },
];

function splitDateTime(scheduledAt: Date | null): { date: string; time: string } {
  if (!scheduledAt) return { date: "", time: "10:00" };
  const d = new Date(scheduledAt);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export function CreatePostModal({
  defaultDate,
  postToEdit,
  onClose,
  onCreated,
}: {
  defaultDate: string | null;
  postToEdit?: SocialPostData;
  onClose: () => void;
  onCreated: () => void;
}) {
  const isEdit = !!postToEdit;
  const initialScheduled = splitDateTime(postToEdit?.scheduledAt ?? null);

  const [title, setTitle] = useState(postToEdit?.title ?? "");
  const [caption, setCaption] = useState(postToEdit?.caption ?? "");
  const [mediaType, setMediaType] = useState(postToEdit?.mediaType ?? "image");
  const [platforms, setPlatforms] = useState<string[]>(postToEdit?.platforms ?? ["instagram"]);
  const [scheduledDate, setScheduledDate] = useState(initialScheduled.date || defaultDate || "");
  const [scheduledTime, setScheduledTime] = useState(initialScheduled.time);
  const [hashtags, setHashtags] = useState(postToEdit?.hashtags.join(" ") ?? "");
  const [status, setStatus] = useState<"draft" | "scheduled">(
    postToEdit?.status === "draft" ? "draft" : "scheduled"
  );
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Media state
  const [singleMediaUrl, setSingleMediaUrl] = useState<string | null>(
    postToEdit && postToEdit.mediaType !== "carousel" ? (postToEdit.mediaUrls[0] ?? null) : null
  );
  const [carouselMediaUrls, setCarouselMediaUrls] = useState<string[]>(
    postToEdit && postToEdit.mediaType === "carousel" ? postToEdit.mediaUrls : []
  );

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

    const payload = {
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
    };

    const result = isEdit
      ? await updateSocialPost(postToEdit!.id, {
          ...payload,
          scheduledAt: payload.scheduledAt ?? null,
        })
      : await createSocialPost(payload);

    setSaving(false);
    if (result.success) {
      onCreated();
    } else {
      toast.error(result.error ?? (isEdit ? "Erro ao atualizar post" : "Erro ao criar post"));
    }
  };

  const previewCaption = [
    caption.trim(),
    ...hashtags
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((h) => (h.startsWith("#") ? h : `#${h}`)),
  ]
    .filter(Boolean)
    .join(" ");
  const previewMedia =
    mediaType === "carousel" ? carouselMediaUrls[0] : (singleMediaUrl ?? undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto transition-all ${
          showPreview && platforms.length > 0 ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{isEdit ? "Editar Post" : "Novo Post"}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPreview((v) => !v)}
              disabled={platforms.length === 0}
              className={`flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                showPreview ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-100"
              }`}
              title="Pré-visualizar"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{showPreview ? "Ocultar" : "Preview"}</span>
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div
          className={`${
            showPreview && platforms.length > 0 ? "grid grid-cols-1 md:grid-cols-2 gap-0" : ""
          }`}
        >
          {showPreview && platforms.length > 0 && (
            <div className="border-b md:border-b-0 md:border-r border-slate-100 p-5 bg-slate-50/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Preview
              </p>
              <PostPreviewer
                caption={previewCaption || "Escreva uma legenda..."}
                mediaUrl={previewMedia}
                platforms={platforms}
              />
            </div>
          )}

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
            {saving
              ? "Salvando..."
              : isEdit
                ? "Salvar alterações"
                : status === "scheduled"
                  ? "Agendar Post"
                  : "Salvar Rascunho"}
          </button>
        </div>
      </div>
    </div>
  );
}
