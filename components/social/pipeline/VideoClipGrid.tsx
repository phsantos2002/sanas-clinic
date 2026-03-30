"use client";

import { useState, useEffect, useCallback } from "react";
import { Video, Loader2, Check, AlertCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { generateVideoClips, checkAllClipsStatus, approveAllClips } from "@/app/actions/pipeline";

type Clip = {
  id: string; order: number; videoUrl: string | null; clipStatus: string;
  provider: string | null; duration: number; isApproved: boolean;
  startFrameId: string; endFrameId: string;
};
type Frame = { id: string; imageUrl: string | null; sceneTitle: string; order: number };

export function VideoClipGrid({ storyId, clips, frames, status }: {
  storyId: string; clips: Clip[]; frames: Frame[]; status: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [clipStats, setClipStats] = useState({ total: clips.length, done: clips.filter((c) => c.clipStatus === "done").length, generating: clips.filter((c) => c.clipStatus === "generating").length, error: clips.filter((c) => c.clipStatus === "error").length });

  const hasGenerating = clipStats.generating > 0;
  const allDone = clipStats.total > 0 && clipStats.done === clipStats.total;

  // Poll for clip status
  const pollStatus = useCallback(async () => {
    if (!hasGenerating) return;
    setPolling(true);
    const result = await checkAllClipsStatus(storyId);
    setPolling(false);
    if (result.success && result.data) {
      setClipStats(result.data);
      if (result.data.generating === 0) {
        toast.success("Todos os clips prontos!");
        window.location.reload();
      }
    }
  }, [storyId, hasGenerating]);

  useEffect(() => {
    if (!hasGenerating) return;
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [hasGenerating, pollStatus]);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateVideoClips(storyId);
    setGenerating(false);
    if (result.success) {
      toast.success("Geracao de clips iniciada! Aguarde...");
      window.location.reload();
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  const handleApproveAll = async () => {
    const result = await approveAllClips(storyId);
    if (result.success) { toast.success("Clips aprovados! Video pronto."); window.location.reload(); }
  };

  const getFrame = (frameId: string) => frames.find((f) => f.id === frameId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-violet-600" />
          <h3 className="font-semibold text-slate-900 text-sm">
            Video Clips ({clipStats.done}/{clipStats.total})
          </h3>
          {hasGenerating && <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />}
        </div>
        <div className="flex gap-2">
          {clips.length === 0 && frames.length >= 2 && (
            <button onClick={handleGenerate} disabled={generating}
              className="px-3 py-1.5 bg-violet-600 text-white rounded-xl text-xs font-medium hover:bg-violet-700 disabled:opacity-50">
              {generating ? "Iniciando..." : "Gerar Video Clips"}
            </button>
          )}
          {allDone && (status === "video_review" || status === "video_generating") && (
            <button onClick={handleApproveAll}
              className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700 flex items-center gap-1">
              <Check className="h-3 w-3" /> Aprovar e Finalizar
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {clipStats.total > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>{clipStats.done} prontos, {clipStats.generating} gerando, {clipStats.error} erros</span>
            <span>{Math.round((clipStats.done / clipStats.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(clipStats.done / clipStats.total) * 100}%` }} />
          </div>
        </div>
      )}

      {clips.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <Video className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            {frames.length < 2
              ? "Precisa de pelo menos 2 frames no storyboard."
              : "Clique em 'Gerar Video Clips' para comecar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clips.map((clip) => {
            const startFrame = getFrame(clip.startFrameId);
            const endFrame = getFrame(clip.endFrameId);
            return (
              <div key={clip.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                {clip.videoUrl ? (
                  <div className="relative">
                    <video src={clip.videoUrl} className="w-full h-48 object-cover" controls muted playsInline />
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                      <Check className="h-2.5 w-2.5" /> Pronto
                    </span>
                  </div>
                ) : (
                  <div className="h-48 bg-slate-50 flex items-center justify-center relative">
                    <div className="flex items-center gap-3">
                      {startFrame?.imageUrl && <img src={startFrame.imageUrl} alt="" className="h-20 w-14 object-cover rounded-lg opacity-60" />}
                      <div className="text-center">
                        {clip.clipStatus === "generating" ? (
                          <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto" />
                        ) : clip.clipStatus === "error" ? (
                          <AlertCircle className="h-8 w-8 text-red-300 mx-auto" />
                        ) : (
                          <Play className="h-8 w-8 text-slate-300 mx-auto" />
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">{clip.clipStatus}</p>
                      </div>
                      {endFrame?.imageUrl && <img src={endFrame.imageUrl} alt="" className="h-20 w-14 object-cover rounded-lg opacity-60" />}
                    </div>
                  </div>
                )}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Clip {clip.order + 1}</p>
                    <p className="text-[10px] text-slate-400">
                      {startFrame?.sceneTitle} → {endFrame?.sceneTitle} — {clip.duration}s
                    </p>
                  </div>
                  {clip.provider && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{clip.provider}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
