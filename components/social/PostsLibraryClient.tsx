"use client";

import { useState } from "react";
import {
  Image,
  Video,
  Layers,
  Clock,
  Filter,
  Trash2,
  Edit3,
  MoreVertical,
  Eye,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { SocialPostData } from "@/app/actions/social";
import { deleteSocialPost, getSocialPosts } from "@/app/actions/social";

const MEDIA_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  carousel: Layers,
  reels: Video,
  story: Clock,
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-600" },
  scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
  generating: { label: "Gerando", color: "bg-amber-100 text-amber-700" },
  ready: { label: "Pronto", color: "bg-emerald-100 text-emerald-700" },
  publishing: { label: "Publicando", color: "bg-indigo-100 text-indigo-700" },
  published: { label: "Publicado", color: "bg-green-100 text-green-700" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-700" },
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  image: "Imagem",
  video: "Video",
  carousel: "Carrossel",
  reels: "Reels",
  story: "Story",
};

const PLATFORM_EMOJIS: Record<string, string> = {
  instagram: "📸",
  facebook: "👍",
  youtube: "▶️",
  tiktok: "🎬",
  linkedin: "🔗",
  pinterest: "📌",
  google_business: "📍",
};

type FilterState = {
  status: string;
  mediaType: string;
  platform: string;
};

export function PostsLibraryClient({
  initialPosts,
}: {
  initialPosts: SocialPostData[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [filters, setFilters] = useState<FilterState>({
    status: "",
    mediaType: "",
    platform: "",
  });
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filteredPosts = posts.filter((p) => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.mediaType && p.mediaType !== filters.mediaType) return false;
    if (filters.platform && !p.platforms.includes(filters.platform)) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    const result = await deleteSocialPost(id);
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post excluido");
    } else {
      toast.error(result.error);
    }
    setMenuOpen(null);
  };

  const handleFilterChange = async (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    const serverFilters: Record<string, string> = {};
    if (updated.status) serverFilters.status = updated.status;
    if (updated.mediaType) serverFilters.mediaType = updated.mediaType;
    if (updated.platform) serverFilters.platform = updated.platform;

    const newPosts = await getSocialPosts(
      Object.keys(serverFilters).length > 0 ? serverFilters : undefined
    );
    setPosts(newPosts);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Filter className="h-4 w-4" />
            Filtros:
          </div>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ status: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filters.mediaType}
            onChange={(e) => handleFilterChange({ mediaType: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos os tipos</option>
            {Object.entries(MEDIA_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filters.platform}
            onChange={(e) => handleFilterChange({ platform: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas as plataformas</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
            <option value="linkedin">LinkedIn</option>
            <option value="google_business">Google Meu Negocio</option>
          </select>

          {(filters.status || filters.mediaType || filters.platform) && (
            <button
              onClick={() =>
                handleFilterChange({ status: "", mediaType: "", platform: "" })
              }
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Post count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
          <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">
            Nenhum post encontrado
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            Crie seu primeiro post no calendario ou gere conteudo com IA
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => {
            const MediaIcon = MEDIA_ICONS[post.mediaType || "image"] || Image;
            const statusConfig = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft;

            return (
              <div
                key={post.id}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-sm transition-all group"
              >
                {/* Preview area */}
                <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative">
                  {post.mediaUrls.length > 0 ? (
                    <img
                      src={post.mediaUrls[0]}
                      alt={post.title || "Post"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MediaIcon className="h-10 w-10 text-slate-200" />
                  )}

                  {/* Status badge */}
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>

                  {/* AI badge */}
                  {post.aiGenerated && (
                    <span className="absolute top-2 right-2 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" />
                      IA
                    </span>
                  )}

                  {/* Menu */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                      className="h-7 w-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center shadow-sm hover:bg-white"
                    >
                      <MoreVertical className="h-3.5 w-3.5 text-slate-600" />
                    </button>

                    {menuOpen === post.id && (
                      <div className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 min-w-[120px] z-10">
                        <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                          <Eye className="h-3.5 w-3.5" /> Ver detalhes
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  {post.title && (
                    <h4 className="font-medium text-slate-900 text-sm truncate">
                      {post.title}
                    </h4>
                  )}

                  {post.caption && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {post.caption}
                    </p>
                  )}

                  {/* Platforms */}
                  <div className="flex items-center gap-1">
                    {post.platforms.map((p) => (
                      <span
                        key={p}
                        className="text-sm"
                        title={p}
                      >
                        {PLATFORM_EMOJIS[p] || p}
                      </span>
                    ))}
                  </div>

                  {/* Schedule info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MediaIcon className="h-3 w-3" />
                      {MEDIA_TYPE_LABELS[post.mediaType || "image"] || post.mediaType}
                    </span>
                    {post.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(post.scheduledAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
