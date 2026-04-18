"use client";

import {
  BarChart3,
  Image,
  Users,
  MousePointerClick,
  TrendingUp,
  CalendarDays,
  Sparkles,
  Link2,
} from "lucide-react";
import type { SocialPostData, SocialConnectionData } from "@/app/actions/social";

type SocialStats = {
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  draftPosts: number;
  connections: number;
} | null;

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  google_business: "Google Meu Negocio",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  facebook: "bg-blue-600",
  youtube: "bg-red-600",
  tiktok: "bg-slate-900",
  linkedin: "bg-blue-700",
  pinterest: "bg-red-600",
  google_business: "bg-green-600",
};

export function SocialAnalyticsClient({
  stats,
  publishedPosts,
  connections,
}: {
  stats: SocialStats;
  publishedPosts: SocialPostData[];
  connections: SocialConnectionData[];
}) {
  if (!stats || stats.totalPosts === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
        <BarChart3 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 mb-1">Sem dados ainda</h3>
        <p className="text-sm text-slate-400">Publique seu primeiro post para ver metricas aqui</p>
      </div>
    );
  }

  // Calculate platform distribution
  const platformCounts: Record<string, number> = {};
  publishedPosts.forEach((post) => {
    post.platforms.forEach((p) => {
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });
  });
  const totalPlatformPosts = Object.values(platformCounts).reduce((a, b) => a + b, 0) || 1;

  // Calculate engagement from engagementData
  const totalEngagement = publishedPosts.reduce((sum, post) => {
    if (!post.engagementData) return sum;
    const data = post.engagementData as Record<string, number>;
    return sum + (data.likes || 0) + (data.comments || 0) + (data.shares || 0);
  }, 0);

  const totalReach = publishedPosts.reduce((sum, post) => {
    if (!post.engagementData) return sum;
    const data = post.engagementData as Record<string, number>;
    return sum + (data.reach || 0);
  }, 0);

  // Media type distribution
  const mediaTypeCounts: Record<string, number> = {};
  publishedPosts.forEach((post) => {
    const type = post.mediaType || "image";
    mediaTypeCounts[type] = (mediaTypeCounts[type] || 0) + 1;
  });

  // Top posts by engagement
  const topPosts = [...publishedPosts]
    .filter((p) => p.engagementData)
    .sort((a, b) => {
      const aData = (a.engagementData || {}) as Record<string, number>;
      const bData = (b.engagementData || {}) as Record<string, number>;
      const aEng = (aData.likes || 0) + (aData.comments || 0) + (aData.shares || 0);
      const bEng = (bData.likes || 0) + (bData.comments || 0) + (bData.shares || 0);
      return bEng - aEng;
    })
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total Posts",
            value: stats.totalPosts,
            icon: Image,
            color: "text-indigo-600 bg-indigo-50",
          },
          {
            label: "Alcance",
            value: totalReach > 0 ? `${(totalReach / 1000).toFixed(1)}K` : "--",
            icon: Users,
            color: "text-blue-600 bg-blue-50",
          },
          {
            label: "Engajamento",
            value: totalEngagement > 0 ? totalEngagement : "--",
            icon: MousePointerClick,
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            label: "Conexoes",
            value: stats.connections,
            icon: Link2,
            color: "text-violet-600 bg-violet-50",
          },
          {
            label: "Agendados",
            value: stats.scheduledPosts,
            icon: CalendarDays,
            color: "text-amber-600 bg-amber-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-100 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`h-8 w-8 rounded-lg flex items-center justify-center ${stat.color}`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance por Plataforma */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            Performance por Plataforma
          </h3>

          {Object.keys(platformCounts).length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Publique posts para ver as metricas
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(platformCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([platform, count]) => {
                  const percentage = Math.round((count / totalPlatformPosts) * 100);
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-700">
                          {PLATFORM_LABELS[platform] || platform}
                        </span>
                        <span className="text-xs text-slate-400">
                          {count} posts ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            PLATFORM_COLORS[platform] || "bg-slate-400"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Tipo de Conteudo */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            Tipos de Conteudo
          </h3>

          {Object.keys(mediaTypeCounts).length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">
              Nenhum dado disponivel
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(mediaTypeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm capitalize text-slate-700">
                        {type === "image"
                          ? "Imagem"
                          : type === "video"
                          ? "Video"
                          : type === "carousel"
                          ? "Carrossel"
                          : type === "reels"
                          ? "Reels"
                          : type === "story"
                          ? "Story"
                          : type}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Posts */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-400" />
          Top Posts por Engajamento
        </h3>

        {topPosts.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Posts publicados com dados de engajamento aparecerão aqui
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Post</th>
                  <th className="pb-2 font-medium text-center">Likes</th>
                  <th className="pb-2 font-medium text-center">Comentarios</th>
                  <th className="pb-2 font-medium text-center">Compartilhamentos</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post) => {
                  const data = (post.engagementData || {}) as Record<string, number>;
                  return (
                    <tr key={post.id} className="border-b border-slate-50">
                      <td className="py-2.5">
                        <span className="text-slate-700 truncate max-w-[200px] block">
                          {post.title || post.caption?.slice(0, 40) || "Post"}
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-slate-600">
                        {data.likes || 0}
                      </td>
                      <td className="py-2.5 text-center text-slate-600">
                        {data.comments || 0}
                      </td>
                      <td className="py-2.5 text-center text-slate-600">
                        {data.shares || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connected Platforms */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-slate-400" />
          Plataformas Conectadas
        </h3>
        {connections.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhuma plataforma conectada.{" "}
            <a href="/dashboard/posts/connect" className="text-indigo-600 hover:text-indigo-700">
              Conectar agora
            </a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                {PLATFORM_LABELS[c.platform] || c.platform}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
