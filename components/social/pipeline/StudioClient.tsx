"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Clapperboard, Film, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createStory, type StoryData } from "@/app/actions/story";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-600", icon: Clock },
  scripting: { label: "Roteiro", color: "bg-blue-100 text-blue-700", icon: Film },
  script_review: { label: "Revisar Roteiro", color: "bg-amber-100 text-amber-700", icon: Film },
  characters: { label: "Personagens", color: "bg-violet-100 text-violet-700", icon: Film },
  char_review: { label: "Revisar Personagens", color: "bg-amber-100 text-amber-700", icon: Film },
  storyboarding: { label: "Storyboard", color: "bg-indigo-100 text-indigo-700", icon: Film },
  storyboard_review: { label: "Revisar Storyboard", color: "bg-amber-100 text-amber-700", icon: Film },
  video_generating: { label: "Gerando Video", color: "bg-purple-100 text-purple-700", icon: Film },
  video_review: { label: "Revisar Video", color: "bg-amber-100 text-amber-700", icon: Film },
  completed: { label: "Pronto", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  published: { label: "Publicado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Erro", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

const VIDEO_TYPES: Record<string, string> = {
  reel: "Reels", story: "Story", tiktok: "TikTok", youtube_short: "YouTube Short", youtube_video: "YouTube Video", carousel: "Carrossel", post: "Post",
};

export function StudioClient({ initialStories }: { initialStories: StoryData[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [videoType, setVideoType] = useState("reel");
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    const result = await createStory({ title: title.trim(), videoType, targetDuration: duration });
    setCreating(false);

    if (result.success && result.data) {
      toast.success("Video criado!");
      router.push(`/dashboard/studio/chat?project=${result.data.id}`);
    } else {
      toast.error(result.success ? "Erro" : result.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clapperboard className="h-5 w-5 text-violet-600" />
          <h2 className="font-semibold text-slate-900">Video Studio</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Video
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="font-semibold text-slate-900">Novo Video com IA</h3>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Titulo / Ideia</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder='Ex: "3 mitos sobre botox que voce precisa saber"'
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Tipo</label>
                <select value={videoType} onChange={(e) => setVideoType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                  {Object.entries(VIDEO_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Duracao (s)</label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                  {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleCreate} disabled={creating || !title.trim()} className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50">
                {creating ? "Criando..." : "Criar Video"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stories Grid */}
      {initialStories.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <Clapperboard className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-1">Nenhum video ainda</h3>
          <p className="text-sm text-slate-400">Crie seu primeiro video com IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialStories.map((story) => {
            const statusCfg = STATUS_CONFIG[story.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={story.id}
                onClick={() => router.push(`/dashboard/studio/chat?project=${story.id}`)}
                className="bg-white border border-slate-100 rounded-2xl p-4 hover:shadow-sm hover:border-slate-200 transition-all cursor-pointer"
              >
                {story.thumbnailUrl ? (
                  <img src={story.thumbnailUrl} alt={story.title} className="w-full h-32 object-cover rounded-xl mb-3" />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl mb-3 flex items-center justify-center">
                    <Film className="h-8 w-8 text-violet-200" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-slate-900 text-sm truncate">{story.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {VIDEO_TYPES[story.videoType]} — {story.targetDuration}s
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                  <span>{story._count.frames} cenas</span>
                  <span>{story._count.videoClips} clips</span>
                  <span>{story._count.chatMessages} msgs</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
