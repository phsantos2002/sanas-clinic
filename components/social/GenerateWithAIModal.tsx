"use client";

import { useState } from "react";
import {
  X,
  Image,
  Video,
  Layers,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  CalendarDays,
  Save,
  Edit3,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { createSocialPost } from "@/app/actions/social";
import { FileUpload } from "./FileUpload";

type ContentType = "image" | "reels" | "carousel" | "story";

type GeneratedContent = {
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  visual_prompt: string;
  best_time: string;
  platform_versions: Record<string, string>;
  imageUrl?: string;
  imageUrls?: string[];
};

const CONTENT_TYPES = [
  { id: "image" as const, label: "Post Unico", icon: Image },
  { id: "reels" as const, label: "Reels / Video", icon: Video },
  { id: "carousel" as const, label: "Carrossel", icon: Layers },
  { id: "story" as const, label: "Story", icon: Clock },
];

const TONES = [
  { id: "profissional", label: "Profissional" },
  { id: "descontraido", label: "Descontraido" },
  { id: "urgente", label: "Urgente / Promo" },
  { id: "educativo", label: "Educativo" },
  { id: "inspirador", label: "Inspirador" },
];

const PLATFORM_OPTIONS = [
  { id: "instagram", label: "Instagram", emoji: "\uD83D\uDCF7" },
  { id: "facebook", label: "Facebook", emoji: "\uD83D\uDCF1" },
  { id: "tiktok", label: "TikTok", emoji: "\uD83C\uDFB5" },
  { id: "linkedin", label: "LinkedIn", emoji: "\uD83D\uDCBC" },
  { id: "google_business", label: "Google", emoji: "\uD83D\uDCCD" },
];

export function GenerateWithAIModal({
  onClose,
  onPostCreated,
}: {
  onClose: () => void;
  onPostCreated: () => void;
}) {
  const [step, setStep] = useState<"input" | "generating" | "preview">("input");
  const [contentType, setContentType] = useState<ContentType>("image");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("profissional");
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [generatingStep, setGeneratingStep] = useState(0);

  // Preview edit state
  const [editCaption, setEditCaption] = useState("");
  const [editHashtags, setEditHashtags] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStep("generating");
    setGeneratingStep(0);

    try {
      // Step 1: Generate caption
      setGeneratingStep(1);
      const captionRes = await fetch("/api/ai/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, contentType, platforms, tone }),
      });

      if (!captionRes.ok) {
        const err = await captionRes.json();
        throw new Error(err.error || "Erro ao gerar texto");
      }
      const captionData = await captionRes.json();

      // Step 2: Generate image (skip for reels - video gen not in this sprint)
      let imageUrl: string | undefined;
      if (contentType !== "reels") {
        setGeneratingStep(2);
        const aspectRatio =
          contentType === "story" ? "9:16" : contentType === "carousel" ? "1:1" : "1:1";

        const imageRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: captionData.visual_prompt || prompt,
            aspectRatio,
            style: tone,
          }),
        });

        if (imageRes.ok) {
          const imageData = await imageRes.json();
          imageUrl = imageData.imageUrl;
        }
      }

      setGeneratingStep(3);

      const content: GeneratedContent = {
        caption: captionData.caption || "",
        hashtags: captionData.hashtags || [],
        hook: captionData.hook || "",
        cta: captionData.cta || "",
        visual_prompt: captionData.visual_prompt || "",
        best_time: captionData.best_time || "10:00",
        platform_versions: captionData.platform_versions || {},
        imageUrl,
      };

      setGenerated(content);
      setEditCaption(content.caption);
      setEditHashtags(content.hashtags.map((h) => `#${h}`).join(" "));
      setScheduleTime(content.best_time || "10:00");
      setStep("preview");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar conteudo"
      );
      setStep("input");
    }
  };

  const handleSave = async (status: "draft" | "scheduled") => {
    if (!generated) return;

    const mediaUrls: string[] = [];
    if (generated.imageUrl) mediaUrls.push(generated.imageUrl);
    if (generated.imageUrls) mediaUrls.push(...generated.imageUrls);

    const scheduledAt =
      status === "scheduled" && scheduleDate
        ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
        : undefined;

    const result = await createSocialPost({
      title: prompt.slice(0, 80),
      caption: editCaption,
      hashtags: editHashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean),
      mediaUrls,
      mediaType: contentType,
      platforms,
      scheduledAt,
      status,
      aiGenerated: true,
    });

    if (result.success) {
      toast.success(
        status === "scheduled" ? "Post agendado com sucesso!" : "Rascunho salvo!"
      );
      onPostCreated();
      onClose();
    } else {
      toast.error("Erro ao salvar post");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Gerar Conteudo com IA</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Step 1: Input */}
        {step === "input" && (
          <>
            <div className="p-5 space-y-4">
              {/* Content Type */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  O que voce quer criar?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setContentType(type.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all ${
                        contentType === type.id
                          ? "bg-violet-50 text-violet-700 border-2 border-violet-200"
                          : "bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100"
                      }`}
                    >
                      <type.icon className="h-5 w-5" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Sobre o que? (descreva a ideia)
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Ex: "Promocao de limpeza de pele com 30% off em abril"'
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Tone */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Tom de voz
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tone === t.id
                          ? "bg-violet-50 text-violet-700 border border-violet-200"
                          : "bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Plataformas
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        platforms.includes(p.id)
                          ? "bg-violet-50 text-violet-700 border border-violet-200"
                          : "bg-slate-50 text-slate-500 border border-transparent hover:bg-slate-100"
                      }`}
                    >
                      <span>{p.emoji}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Image */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Imagem de referencia (opcional)
                </label>
                <FileUpload
                  mode="single"
                  accept="image/jpeg,image/png,image/webp"
                  value={referenceUrl}
                  onChange={(url) => setReferenceUrl(url)}
                  hint="Logo, foto do produto ou estilo visual desejado"
                />
              </div>

              {/* Cost estimate */}
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                <div className="flex items-center gap-2 text-sm text-violet-700">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium">Custo estimado:</span>
                  <span>
                    ~R${" "}
                    {contentType === "reels"
                      ? "0,06"
                      : contentType === "carousel"
                      ? "0,35"
                      : "0,30"}{" "}
                    (texto + imagem)
                  </span>
                </div>
                <p className="text-xs text-violet-500 mt-1 ml-6">
                  Custo cobrado pelo seu provedor de IA configurado
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim()}
                className="flex-1 py-2.5 px-4 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Gerar Conteudo
              </button>
            </div>
          </>
        )}

        {/* Step 2: Generating */}
        {step === "generating" && (
          <div className="p-10 flex flex-col items-center">
            <div className="h-16 w-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
              <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-6 text-center">
              Gerando seu conteudo...
            </h3>
            <div className="space-y-3 w-full max-w-xs">
              {[
                "Gerando texto e hashtags...",
                "Criando visual com IA...",
                "Finalizando...",
              ].map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  {generatingStep > i + 1 ? (
                    <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : generatingStep === i + 1 ? (
                    <Loader2 className="h-5 w-5 text-violet-600 animate-spin" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-slate-200 rounded-full" />
                  )}
                  <span
                    className={`text-sm ${
                      generatingStep >= i + 1
                        ? "text-slate-700"
                        : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && generated && (
          <>
            <div className="p-5 space-y-4">
              {/* Generated image preview */}
              {generated.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={generated.imageUrl}
                    alt="Generated"
                    className="w-full h-56 object-cover"
                  />
                </div>
              )}

              {!generated.imageUrl && contentType === "reels" && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-700">
                  Geracao de video sera disponibilizada em breve. Voce pode fazer upload de um video manualmente ao editar o post.
                </div>
              )}

              {/* Hook */}
              {generated.hook && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                  <p className="text-xs font-medium text-indigo-600 mb-1">
                    Gancho de scroll
                  </p>
                  <p className="text-sm text-indigo-800">{generated.hook}</p>
                </div>
              )}

              {/* Caption (editable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-slate-700">
                    Legenda
                  </label>
                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={5}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Hashtags (editable) */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* CTA */}
              {generated.cta && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-xs font-medium text-green-600 mb-1">
                    Call to Action sugerido
                  </p>
                  <p className="text-sm text-green-800">{generated.cta}</p>
                </div>
              )}

              {/* Schedule */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Agendar para
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                {generated.best_time && (
                  <p className="text-xs text-slate-400 mt-1">
                    Horario sugerido pela IA: {generated.best_time}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => {
                  setGenerated(null);
                  setStep("input");
                }}
                className="flex items-center gap-1.5 py-2.5 px-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refazer
              </button>
              <button
                onClick={() => handleSave("draft")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Save className="h-3.5 w-3.5" />
                Rascunho
              </button>
              <button
                onClick={() => handleSave("scheduled")}
                disabled={!scheduleDate}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Agendar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
