"use client";

import { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Image,
  Video,
  Layers,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { SocialPostData } from "@/app/actions/social";
import { getScheduledPosts } from "@/app/actions/social";
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

const MEDIA_ICONS: Record<string, typeof Image> = {
  image: Image,
  video: Video,
  carousel: Layers,
  reels: Video,
  story: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-blue-100 text-blue-700",
  generating: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  publishing: "bg-indigo-100 text-indigo-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0, Sun=6)
  return day === 0 ? 6 : day - 1;
}

export function CalendarClient({
  initialPosts,
  initialMonth,
  initialYear,
}: {
  initialPosts: SocialPostData[];
  initialMonth: number;
  initialYear: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [posts, setPosts] = useState(initialPosts);
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
      setPosts(newPosts);
    },
    [month, year]
  );

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  const getPostsForDay = (day: number) => {
    return posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = new Date(p.scheduledAt);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setShowCreateModal(true);
  };

  const handlePostCreated = async () => {
    setShowCreateModal(false);
    setSelectedDate(null);
    const updated = await getScheduledPosts(month, year);
    setPosts(updated);
    toast.success("Post criado com sucesso!");
  };

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <div className="flex items-center justify-between">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedDate(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Agendar Post</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {/* Weekday headers */}
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

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[100px] border-b border-r border-slate-50 bg-slate-25"
            />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayPosts = getPostsForDay(day);
            const isToday = isCurrentMonth && today.getDate() === day;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
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

                {/* Post indicators */}
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map((post) => {
                    const MediaIcon = MEDIA_ICONS[post.mediaType || "image"] || Image;
                    const time = post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";
                    return (
                      <div
                        key={post.id}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                          STATUS_COLORS[post.status] || STATUS_COLORS.draft
                        }`}
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

          {/* Empty cells after last day to complete the grid */}
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

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
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
            icon: Image,
            color: "text-green-600 bg-green-50",
          },
        ].map((stat) => (
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

      {/* Create Post Modal */}
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
