"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, CheckCheck, ExternalLink, X } from "lucide-react";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/app/actions/notifications";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entityId: string | null;
  entityType: string | null;
  actionUrl: string | null;
  createdAt: Date;
};

const TYPE_COLORS: Record<string, string> = {
  new_lead: "bg-emerald-500",
  lead_stuck: "bg-amber-500",
  cpl_alert: "bg-red-500",
  lead_replied: "bg-blue-500",
  workflow_error: "bg-red-600",
  broadcast_done: "bg-teal-500",
  score_change: "bg-violet-500",
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const [items, count] = await Promise.all([
      open ? getNotifications(20) : Promise.resolve(null),
      getUnreadCount(),
    ]);
    if (items) setNotifications(items as Notification[]);
    setUnreadCount(count);
  }, [open]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Notificacoes</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">Nenhuma notificacao</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 transition-colors ${
                    n.read ? "bg-white" : "bg-indigo-50/40"
                  } hover:bg-slate-50`}
                >
                  <div
                    className={`mt-1 h-2 w-2 rounded-full shrink-0 ${TYPE_COLORS[n.type] || "bg-slate-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-tight ${n.read ? "text-slate-600" : "text-slate-800 font-medium"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                      {n.actionUrl && (
                        <Link
                          href={n.actionUrl}
                          onClick={() => {
                            handleMarkRead(n.id);
                            setOpen(false);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                        >
                          Ver <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="mt-1 p-1 text-slate-300 hover:text-indigo-600 rounded transition-colors shrink-0"
                      title="Marcar como lida"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
