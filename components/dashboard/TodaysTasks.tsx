"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Phone, ArrowRight, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getTodaysTasks } from "@/app/actions/dashboard";
import { LeadScoreBadge } from "@/components/ui/LeadScoreBadge";

type TaskItem = {
  leadId: string;
  leadName: string;
  phone: string;
  score: number;
  scoreLabel: string | null;
  reason: string;
  urgencyLevel: "high" | "medium" | "low";
};

export function TodaysTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodaysTasks().then((data) => {
      setTasks(data || []);
      setLoading(false);
    });
  }, []);

  const markDone = (leadId: string) => {
    setCompleted((prev) => new Set(prev).add(leadId));
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg mb-2" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4">
      <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-400" />
        Proximas Acoes
        <span className="text-[10px] text-slate-400 font-normal">
          {tasks.length - completed.size} pendente{tasks.length - completed.size !== 1 ? "s" : ""}
        </span>
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => {
          const isDone = completed.has(task.leadId);
          return (
            <div
              key={task.leadId}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                isDone
                  ? "border-green-100 bg-green-50/50 opacity-60"
                  : task.urgencyLevel === "high"
                    ? "border-red-100 bg-red-50/30"
                    : "border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm font-medium truncate ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}
                  >
                    {task.leadName}
                  </p>
                  <LeadScoreBadge score={task.score} label={task.scoreLabel} variant="compact" />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{task.reason}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!isDone && (
                  <>
                    <Link
                      href={`/dashboard/chat?leadId=${task.leadId}`}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Abrir chat"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </Link>
                    <a
                      href={`tel:${task.phone}`}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                      title="Ligar"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => markDone(task.leadId)}
                      className="p-1.5 text-slate-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                      title="Marcar como feito"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                {isDone && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </div>
            </div>
          );
        })}
      </div>
      <Link
        href="/dashboard/pipeline"
        className="flex items-center justify-center gap-1 mt-3 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        Ver todos os leads <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
