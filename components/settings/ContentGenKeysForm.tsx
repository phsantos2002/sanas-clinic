"use client";

import { useState } from "react";
import { toast } from "sonner";
import { saveContentGenKeys } from "@/app/actions/brandSettings";

type Props = {
  initial: {
    aiImageProvider: string;
    aiImageApiKey: string;
    aiVideoProvider: string;
    aiVideoApiKey: string;
  };
  usage: {
    captions: number;
    images: number;
    videos: number;
    totalCostUsd: number;
  } | null;
};

const IMAGE_PROVIDERS = [
  { id: "openai", label: "OpenAI DALL-E 3", cost: "~R$ 0,23/img" },
  { id: "replicate", label: "Replicate (Flux)", cost: "~R$ 0,02/img" },
  { id: "fal", label: "Fal.ai (Flux)", cost: "~R$ 0,02/img" },
];

const VIDEO_PROVIDERS = [
  { id: "replicate", label: "Replicate", cost: "~R$ 1,70/video" },
  { id: "fal", label: "Fal.ai (Kling)", cost: "~R$ 0,58/video" },
  { id: "none", label: "Desativado", cost: "Sem custo" },
];

export function ContentGenKeysForm({ initial, usage }: Props) {
  const [imageProvider, setImageProvider] = useState(initial.aiImageProvider);
  const [imageKey, setImageKey] = useState(initial.aiImageApiKey);
  const [videoProvider, setVideoProvider] = useState(initial.aiVideoProvider);
  const [videoKey, setVideoKey] = useState(initial.aiVideoApiKey);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const result = await saveContentGenKeys({
      aiImageProvider: imageProvider,
      aiImageApiKey: imageKey,
      aiVideoProvider: videoProvider,
      aiVideoApiKey: videoKey,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Chaves de API salvas!");
    } else {
      toast.error(result.error);
    }
  };

  const needsImageKey = imageProvider !== "openai";
  const needsVideoKey =
    videoProvider !== "none" && videoProvider !== imageProvider;

  return (
    <div className="space-y-4">
      {/* Image Provider */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Provedor de Imagens
        </label>
        <div className="grid grid-cols-3 gap-2">
          {IMAGE_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setImageProvider(p.id)}
              className={`flex flex-col items-center p-3 rounded-xl text-xs font-medium transition-all ${
                imageProvider === p.id
                  ? "bg-indigo-50 text-indigo-700 border-2 border-indigo-200"
                  : "bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100"
              }`}
            >
              <span className="font-semibold">{p.label}</span>
              <span className="text-[10px] mt-0.5 opacity-70">{p.cost}</span>
            </button>
          ))}
        </div>
      </div>

      {needsImageKey ? (
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Chave de API — {imageProvider === "replicate" ? "Replicate" : "Fal.ai"}
          </label>
          <input
            type="password"
            value={imageKey}
            onChange={(e) => setImageKey(e.target.value)}
            placeholder={
              imageProvider === "replicate"
                ? "r8_..."
                : "Obtenha em fal.ai/dashboard"
            }
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-400 mt-1">
            {imageProvider === "replicate"
              ? "Obtenha em replicate.com/account/api-tokens"
              : "Obtenha em fal.ai/dashboard/keys"}
          </p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">
          Usando a mesma chave OpenAI configurada na secao de IA acima
        </div>
      )}

      {/* Video Provider */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Provedor de Video (para Reels)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {VIDEO_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setVideoProvider(p.id)}
              className={`flex flex-col items-center p-3 rounded-xl text-xs font-medium transition-all ${
                videoProvider === p.id
                  ? "bg-indigo-50 text-indigo-700 border-2 border-indigo-200"
                  : "bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-slate-100"
              }`}
            >
              <span className="font-semibold">{p.label}</span>
              <span className="text-[10px] mt-0.5 opacity-70">{p.cost}</span>
            </button>
          ))}
        </div>
      </div>

      {needsVideoKey && (
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1 block">
            Chave de API — {videoProvider === "replicate" ? "Replicate" : "Fal.ai"}
          </label>
          <input
            type="password"
            value={videoKey}
            onChange={(e) => setVideoKey(e.target.value)}
            placeholder="Cole sua chave de API"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      )}

      {videoProvider !== "none" && videoProvider === imageProvider && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">
          Usando a mesma chave do provedor de imagens
        </div>
      )}

      {/* Usage stats */}
      {usage && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <h4 className="font-medium text-slate-700 text-sm mb-3">
            Uso este mes
          </h4>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-slate-900">{usage.captions}</p>
              <p className="text-[11px] text-slate-400">Textos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{usage.images}</p>
              <p className="text-[11px] text-slate-400">Imagens</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{usage.videos}</p>
              <p className="text-[11px] text-slate-400">Videos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-violet-600">
                ~R$ {(usage.totalCostUsd * 5.8).toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400">Custo total</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Chaves de API"}
      </button>
    </div>
  );
}
