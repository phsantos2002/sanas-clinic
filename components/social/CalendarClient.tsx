"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  List,
  Image as ImageIcon,
  Video,
  Layers,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SocialPostData } from "@/app/actions/social";
import { getAllScheduledPosts, getScheduledPosts, deleteSocialPost } from "@/app/actions/social";
import { PLATFORM_LOGOS } from "@/components/icons/PlatformLogos";
import { CreatePostModal } from "./CreatePostModal";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MEDIA_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  carousel: Layers,
  reels: Video,
  story: Clock,
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-slate-100 text-slate-600" },
  scheduled: { label: "Agendado", className: "bg-blue-100 text-blue-700" },
  generating: { label: "Gerando", className: "bg-amber-100 text-amber-700" },
  ready: { label: "Pronto", className: "bg-emerald-100 text-emerald-700" },
  publishing: { label: "Publicando", className: "bg-indigo-100 text-indigo-700" },
  published: { label: "Publicado", className: "bg-green-100 text-green-700" },
  failed: { label: "Falhou", className: "bg-red-100 text-red-700" },
};

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatScheduledLabel(scheduledAt: Date | null) {
  if (!scheduledAt) return "Sem data";
  const d = new Date(scheduledAt);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGroupLabel(scheduledAt: Date | null) {
  if (!scheduledAt) return "Sem data";
  const d = new Date(scheduledAt);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function CalendarClient({
  initialPosts,
  initialAllPosts,
  initialMonth,
  initialYear,
}: {
  initialPosts: SocialPostData[];
  initialAllPosts: SocialPostData[];
  initialMonth: number;
  initialYear: number;
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [monthPosts, setMonthPosts] = useState(initialPosts);
  const [allPosts, setAllPosts] = useState(initialAllPosts);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const navigateMonth = useCallback(
    async (direction: -1 | 1) => {
      let newMonth = month + direction;
      let newYear = year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      setMonth(newMonth);
      setYear(newYear);
      const newPosts = await getScheduledPosts(newMonth, newYear);
      setMonthPosts(newPosts);
    },
    [month, year]
  );

  const refreshAll = useCallback(async () => {
    const [fresh, freshMonth] = await Promise.all([
      getAllScheduledPosts(),
      getScheduledPosts(month, year),
    ]);
    setAllPosts(fresh);
    setMonthPosts(freshMonth);
  }, [month, year]);

  const handlePostCreated = async () => {
    setShowCreateModal(false);
    setSelectedDate(null);
    await refreshAll();
    toast.success("Post criado com sucesso!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este post?")) return;
    const result = await deleteSocialPost(id);
    if (result.success) {
      await refreshAll();
      toast.success("Post excluído");
    } else {
      toast.error(result.error ?? "Erro ao excluir");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1 bg-slate-50 rounded-xl p-1">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                view === "calendar"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarDays className="h-4 w-4" /> Calendário
            </button>
          </div>

          {view === "calendar" && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <h2 className="text-base font-semibold text-slate-900 min-w-[160px] text-center">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedDate(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar Post</span>
          </button>
        </div>
      </div>

      {view === "list" ? (
        <ListView posts={allPosts} onDelete={handleDelete} />
      ) : (
        <CalendarView
          month={month}
          year={year}
          posts={monthPosts}
          onDayClick={(dateStr) => {
            setSelectedDate(dateStr);
            setShowCreateModal(true);
          }}
        />
      )}

      <StatsBar posts={allPosts} />

      {showCreateModal && (
        <CreatePostModal
          defaultDate={selectedDate}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
          }}
          onCreated={handlePostCreated}
        />
      )}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────

function ListView({
  posts,
  onDelete,
}: {
  posts: SocialPostData[];
  onDelete: (id: string) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
        <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">Nenhum post ainda</p>
        <p className="text-xs text-slate-400 mt-1">
          Clique em &quot;Agendar Post&quot; para criar o primeiro.
        </p>
      </div>
    );
  }

  // Group by month
  const groups = new Map<string, SocialPostData[]>();
  for (const post of posts) {
    const key = formatGroupLabel(post.scheduledAt);
    const arr = groups.get(key) ?? [];
    arr.push(post);
    groups.set(key, arr);
  }

  return (
    <div className="space-y-5">
      {Array.from(groups.entries()).map(([group, items]) => (
        <div key={group}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {group}
          </h3>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50">
            {items.map((post) => (
              <PostRow key={post.id} post={post} onDelete={() => onDelete(post.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PostRow({ post, onDelete }: { post: SocialPostData; onDelete: () => void }) {
  const MediaIcon = MEDIA_ICONS[post.mediaType || "image"] || ImageIcon;
  const status = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
  const displayTitle = post.title || post.caption || "(sem título)";
  const thumb = post.mediaUrls[0];

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-slate-50/60 transition-colors">
      {/* Thumbnail or icon */}
      <div className="h-12 w-12 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <MediaIcon className="h-5 w-5 text-slate-400" />
        )}
      </div>

      {/* Middle: title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 line-clamp-1">{displayTitle}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${status.className}`}>
            {status.label}
          </span>
          {post.aiGenerated && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
              IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatScheduledLabel(post.scheduledAt)}
          </span>
          {post.hashtags.length > 0 && (
            <span className="text-indigo-500 truncate max-w-[220px]">
              {post.hashtags
                .slice(0, 3)
                .map((h) => `#${h}`)
                .join(" ")}
              {post.hashtags.length > 3 && ` +${post.hashtags.length - 3}`}
            </span>
          )}
        </div>
      </div>

      {/* Platforms */}
      <div className="flex items-center gap-1 shrink-0">
        {post.platforms.map((p) => {
          const Logo = PLATFORM_LOGOS[p];
          return Logo ? <Logo key={p} className="h-5 w-5" /> : null;
        })}
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
        aria-label="Excluir post"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Calendar view (código anterior preservado) ────────────────

function CalendarView({
  month,
  year,
  posts,
  onDayClick,
}: {
  month: number;
  year: number;
  posts: SocialPostData[];
  onDayClick: (dateStr: string) => void;
}) {
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const getPostsForDay = (day: number) =>
    posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = new Date(p.scheduledAt);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-medium text-slate-400 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="min-h-[100px] border-b border-r border-slate-50 bg-slate-25"
          />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayPosts = getPostsForDay(day);
          const isToday = isCurrentMonth && today.getDate() === day;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

          return (
            <div
              key={day}
              onClick={() => onDayClick(dateStr)}
              className="min-h-[100px] border-b border-r border-slate-50 p-1.5 cursor-pointer hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 group-hover:text-slate-900"
                  }`}
                >
                  {day}
                </span>
                {dayPosts.length > 0 && (
                  <span className="text-[10px] text-slate-400">{dayPosts.length}</span>
                )}
              </div>

              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((post) => {
                  const MediaIcon = MEDIA_ICONS[post.mediaType || "image"] || ImageIcon;
                  const status = STATUS_STYLES[post.status] ?? STATUS_STYLES.draft;
                  const time = post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div
                      key={post.id}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${status.className}`}
                      title={post.title || post.caption || "Post"}
                    >
                      <MediaIcon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">
                        {time} {post.title || post.mediaType}
                      </span>
                    </div>
                  );
                })}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-slate-400 px-1.5">
                    +{dayPosts.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {(() => {
          const totalCells = firstDay + daysInMonth;
          const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
          return Array.from({ length: remaining }).map((_, i) => (
            <div
              key={`end-${i}`}
              className="min-h-[100px] border-b border-r border-slate-50 bg-slate-25"
            />
          ));
        })()}
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────

function StatsBar({ posts }: { posts: SocialPostData[] }) {
  const stats = [
    {
      label: "Agendados",
      value: posts.filter((p) => p.status === "scheduled").length,
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Rascunhos",
      value: posts.filter((p) => p.status === "draft").length,
      icon: Clock,
      color: "text-slate-600 bg-slate-50",
    },
    {
      label: "Publicados",
      value: posts.filter((p) => p.status === "published").length,
      icon: ImageIcon,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Total",
      value: posts.length,
      icon: List,
      color: "text-indigo-600 bg-indigo-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3"
        >
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${stat.color}`}>
            <stat.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-400">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
