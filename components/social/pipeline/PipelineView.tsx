"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Users, LayoutGrid, Video, Send,
  Check, Loader2, Circle,
} from "lucide-react";
import { ScriptChat } from "./ScriptChat";
import { CharacterGallery } from "./CharacterGallery";
import { StoryboardEditor } from "./StoryboardEditor";
import { VideoClipGrid } from "./VideoClipGrid";

type PipelineStage = {
  id: string;
  label: string;
  icon: typeof FileText;
  stageKey: string;
};

const STAGES: PipelineStage[] = [
  { id: "script", label: "Roteiro", icon: FileText, stageKey: "script" },
  { id: "characters", label: "Personagens", icon: Users, stageKey: "characters" },
  { id: "storyboard", label: "Storyboard", icon: LayoutGrid, stageKey: "storyboard" },
  { id: "video", label: "Video", icon: Video, stageKey: "video" },
  { id: "publish", label: "Publicar", icon: Send, stageKey: "publish" },
];

function getStageStatus(stageKey: string, currentStage: string, status: string): "done" | "active" | "pending" {
  const order = STAGES.findIndex((s) => s.id === stageKey);
  const currentOrder = STAGES.findIndex((s) => s.id === currentStage);
  if (order < currentOrder) return "done";
  if (order === currentOrder) return "active";
  return "pending";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PipelineView({ story, pipelineStatus }: { story: any; pipelineStatus: any }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(story.currentStage || "script");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/dashboard/studio")} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </button>
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900 truncate">{story.title}</h2>
          <p className="text-xs text-slate-400">{story.videoType.toUpperCase()} — {story.targetDuration}s</p>
        </div>
      </div>

      {/* Pipeline Tracker */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          {STAGES.map((stage, i) => {
            const stageStatus = getStageStatus(stage.id, story.currentStage, story.status);
            return (
              <div key={stage.id} className="flex items-center">
                <button
                  onClick={() => setActiveTab(stage.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === stage.id
                      ? "bg-violet-50 text-violet-700"
                      : stageStatus === "done"
                      ? "text-green-600 hover:bg-green-50"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {stageStatus === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : stageStatus === "active" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{stage.label}</span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${stageStatus === "done" ? "bg-green-300" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stage Content */}
      <div className="min-h-[400px]">
        {activeTab === "script" && (
          <ScriptChat
            storyId={story.id}
            messages={story.chatMessages}
            hasScript={!!story.scriptJson}
            scriptJson={story.scriptJson}
            status={story.status}
          />
        )}
        {activeTab === "characters" && (
          <CharacterGallery
            storyId={story.id}
            characters={story.characters}
            status={story.status}
          />
        )}
        {activeTab === "storyboard" && (
          <StoryboardEditor
            storyId={story.id}
            frames={story.frames}
            status={story.status}
          />
        )}
        {activeTab === "video" && (
          <VideoClipGrid
            storyId={story.id}
            clips={story.videoClips}
            frames={story.frames}
            status={story.status}
          />
        )}
        {activeTab === "publish" && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center">
            {story.status === "completed" || story.status === "published" ? (
              <div className="space-y-3">
                <Check className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="font-semibold text-slate-900">Video pronto!</h3>
                <p className="text-sm text-slate-400">Seus clips estao prontos para download e publicacao.</p>
                {story.videoClips?.filter((c: { videoUrl: string }) => c.videoUrl).map((clip: { id: string; order: number; videoUrl: string }, i: number) => (
                  <a key={clip.id} href={clip.videoUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 mx-1">
                    <Video className="h-4 w-4" /> Clip {i + 1}
                  </a>
                ))}
              </div>
            ) : (
              <div>
                <Circle className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Complete os estagios anteriores primeiro.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
