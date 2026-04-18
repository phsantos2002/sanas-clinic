"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  MessageSquare,
  UserPlus,
  Tag,
  Repeat,
  Mail,
  MailOpen,
  Upload,
  Sparkles,
  Clock,
} from "lucide-react";

type ActivityRow = {
  id: string;
  type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  actorType: string;
  actorName: string | null;
  createdAt: string | Date;
};

const ICONS: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  stage_change: { icon: ArrowRight, color: "text-indigo-600", bg: "bg-indigo-50" },
  assignment: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  tag_added: { icon: Tag, color: "text-violet-600", bg: "bg-violet-50" },
  tag_removed: { icon: Tag, color: "text-slate-500", bg: "bg-slate-50" },
  cadence_enrolled: { icon: Repeat, color: "text-amber-600", bg: "bg-amber-50" },
  cadence_stopped: { icon: Repeat, color: "text-slate-500", bg: "bg-slate-50" },
  email_sent: { icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
  email_opened: { icon: MailOpen, color: "text-green-600", bg: "bg-green-50" },
  message_sent: { icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" },
  import: { icon: Upload, color: "text-slate-500", bg: "bg-slate-50" },
  enrichment: { icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
  note: { icon: Activity, color: "text-slate-600", bg: "bg-slate-50" },
};

function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function LeadActivityTimeline({ leadId }: { leadId: string }) {
  const [activities, setActivities] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leads/${leadId}/activities`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setActivities(data.activities || []);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (activities === null) {
    return (
      <div className="text-xs text-slate-400 py-4 text-center">Carregando atividades...</div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-xs text-slate-400 py-4 text-center flex flex-col items-center gap-1">
        <Clock className="h-5 w-5 text-slate-200" />
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((a, i) => {
        const meta = ICONS[a.type] || ICONS.note;
        const Icon = meta.icon;
        const last = i === activities.length - 1;
        return (
          <div key={a.id} className="flex gap-3 relative">
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
              </div>
              {!last && <div className="w-px bg-slate-100 flex-1 my-1" />}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <p className="text-xs text-slate-800">{a.summary}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {timeAgo(a.createdAt)}
                {a.actorName && ` · ${a.actorName}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
