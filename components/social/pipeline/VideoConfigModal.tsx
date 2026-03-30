"use client";

import { useState } from "react";
import { X, Settings2, Zap } from "lucide-react";

export type VideoConfig = {
  provider: string;
  model: string;
  mode: string;
  duration: 5 | 10;
  camera: string;
};

const PROVIDERS = [
  { id: "fal", label: "Fal.ai (Kling)", description: "Rapido e acessivel", cost: "~R$0,58/clip" },
  { id: "replicate", label: "Replicate (MiniMax)", description: "Boa qualidade", cost: "~R$1,70/clip" },
];

const MODELS: Record<string, { id: string; label: string }[]> = {
  fal: [
    { id: "kling-v1-standard", label: "Kling v1 Standard" },
    { id: "kling-v1-pro", label: "Kling v1 Pro" },
  ],
  replicate: [
    { id: "minimax-video-01", label: "MiniMax Video-01" },
    { id: "stable-video-diffusion", label: "Stable Video Diffusion" },
  ],
};

const CAMERAS = [
  { id: "none", label: "Nenhum (automatico)" },
  { id: "zoom_in", label: "Zoom In" },
  { id: "zoom_out", label: "Zoom Out" },
  { id: "pan_left", label: "Pan Left" },
  { id: "pan_right", label: "Pan Right" },
  { id: "tilt_up", label: "Tilt Up" },
  { id: "tilt_down", label: "Tilt Down" },
  { id: "dolly_forward", label: "Dolly Forward" },
  { id: "dolly_back", label: "Dolly Back" },
];

export function VideoConfigModal({
  config,
  onSave,
  onClose,
}: {
  config: VideoConfig;
  onSave: (config: VideoConfig) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState(config.provider);
  const [model, setModel] = useState(config.model);
  const [mode, setMode] = useState(config.mode);
  const [duration, setDuration] = useState<5 | 10>(config.duration);
  const [camera, setCamera] = useState(config.camera);

  const models = MODELS[provider] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-violet-600" />
            <h3 className="font-semibold text-slate-900">Configuracao de Video</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Provedor</label>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setModel(MODELS[p.id]?.[0]?.id || ""); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    provider === p.id
                      ? "bg-violet-50 border-2 border-violet-200"
                      : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.label}</p>
                    <p className="text-xs text-slate-400">{p.description}</p>
                  </div>
                  <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                    {p.cost}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          {models.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Modelo</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Mode */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Qualidade</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("standard")}
                className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                  mode === "standard"
                    ? "bg-violet-50 text-violet-700 border-2 border-violet-200"
                    : "bg-slate-50 text-slate-500 border-2 border-transparent"
                }`}
              >
                Standard
                <p className="text-[10px] text-slate-400 mt-0.5">Mais rapido, mais barato</p>
              </button>
              <button
                onClick={() => setMode("pro")}
                className={`p-3 rounded-xl text-center text-sm font-medium transition-all ${
                  mode === "pro"
                    ? "bg-violet-50 text-violet-700 border-2 border-violet-200"
                    : "bg-slate-50 text-slate-500 border-2 border-transparent"
                }`}
              >
                Pro
                <p className="text-[10px] text-slate-400 mt-0.5">Melhor qualidade</p>
              </button>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Duracao por clip</label>
            <div className="grid grid-cols-2 gap-2">
              {([5, 10] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl text-sm font-medium transition-all ${
                    duration === d
                      ? "bg-violet-50 text-violet-700 border-2 border-violet-200"
                      : "bg-slate-50 text-slate-500 border-2 border-transparent"
                  }`}
                >
                  {d} segundos
                </button>
              ))}
            </div>
          </div>

          {/* Camera Movement */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Movimento de camera</label>
            <select
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {CAMERAS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Cost estimate */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-600" />
            <span className="text-sm text-violet-700">
              Custo estimado por clip: ~R${" "}
              {provider === "fal"
                ? mode === "pro" ? "1,16" : "0,58"
                : "1,70"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ provider, model, mode, duration, camera })}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700"
          >
            Salvar Configuracao
          </button>
        </div>
      </div>
    </div>
  );
}
