"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, ThumbsUp, Share2 } from "lucide-react";

type Props = {
  caption: string;
  mediaUrl?: string;
  profileName?: string;
  platforms: string[];
};

export function PostPreviewer({ caption, mediaUrl, profileName = "seu_perfil", platforms }: Props) {
  const [activeTab, setActiveTab] = useState(platforms[0] || "instagram");

  const PLATFORM_LABELS: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    youtube: "YouTube",
    tiktok: "TikTok",
    linkedin: "LinkedIn",
    google_business: "Google Business",
  };
  const tabs = platforms.map((p) => ({ id: p, label: PLATFORM_LABELS[p] ?? p }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Tab bar */}
      {tabs.length > 1 && (
        <div className="flex border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="p-3">
        {activeTab === "instagram" && (
          <div className="max-w-[320px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="text-[8px] font-bold text-slate-700">
                    {profileName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-900">{profileName}</span>
            </div>
            {/* Media */}
            <div className="aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              {mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Preview da imagem</span>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-slate-700" />
                <MessageCircle className="h-5 w-5 text-slate-700" />
                <Send className="h-5 w-5 text-slate-700" />
              </div>
              <Bookmark className="h-5 w-5 text-slate-700" />
            </div>
            {/* Caption */}
            <p className="text-xs text-slate-800 leading-relaxed">
              <span className="font-semibold">{profileName}</span> {caption.slice(0, 200)}
              {caption.length > 200 ? "..." : ""}
            </p>
          </div>
        )}

        {activeTab === "facebook" && (
          <div className="max-w-[360px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {profileName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{profileName}</p>
                <p className="text-[10px] text-slate-400">Agora mesmo · Publico</p>
              </div>
            </div>
            {/* Caption */}
            <p className="text-sm text-slate-800 mb-2 leading-relaxed">{caption.slice(0, 500)}</p>
            {/* Media */}
            <div className="aspect-video bg-slate-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
              {mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Preview da imagem</span>
              )}
            </div>
            {/* Reactions */}
            <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
              <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600">
                <ThumbsUp className="h-4 w-4" /> Curtir
              </button>
              <button className="flex items-center gap-1.5 text-xs text-slate-500">
                <MessageCircle className="h-4 w-4" /> Comentar
              </button>
              <button className="flex items-center gap-1.5 text-xs text-slate-500">
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
            </div>
          </div>
        )}

        {activeTab === "tiktok" && (
          <div className="max-w-[240px] mx-auto">
            <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden relative">
              {mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-slate-400">Preview 9:16</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-xs font-semibold text-white">@{profileName}</p>
                <p className="text-[11px] text-white/90 line-clamp-2 mt-0.5">{caption}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "linkedin" && (
          <div className="max-w-[360px] mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#0A66C2] flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {profileName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{profileName}</p>
                <p className="text-[10px] text-slate-400">Agora · Público</p>
              </div>
            </div>
            <p className="text-sm text-slate-800 mb-2 leading-relaxed whitespace-pre-wrap">
              {caption.slice(0, 700)}
            </p>
            {mediaUrl && (
              <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-4 pt-2 mt-2 border-t border-slate-100">
              <button className="flex items-center gap-1.5 text-xs text-slate-500">
                <ThumbsUp className="h-4 w-4" /> Gostei
              </button>
              <button className="flex items-center gap-1.5 text-xs text-slate-500">
                <MessageCircle className="h-4 w-4" /> Comentar
              </button>
              <button className="flex items-center gap-1.5 text-xs text-slate-500">
                <Share2 className="h-4 w-4" /> Repostar
              </button>
            </div>
          </div>
        )}

        {activeTab === "youtube" && (
          <div className="max-w-[360px] mx-auto">
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden relative">
              {mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-slate-400">Thumbnail 16:9</span>
                </div>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-2 line-clamp-2">
              {caption.split("\n")[0] || "Título do vídeo"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {profileName} · 0 visualizações · agora
            </p>
          </div>
        )}

        {activeTab === "google_business" && (
          <div className="max-w-[360px] mx-auto border border-slate-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4285F4] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">G</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900">{profileName}</p>
                <p className="text-[10px] text-slate-400">Google Business · agora</p>
              </div>
            </div>
            {mediaUrl && (
              <div className="aspect-[4/3] bg-slate-100 rounded-lg mb-2 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs text-slate-800 leading-relaxed">{caption.slice(0, 300)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
