"use client";

import Link from "next/link";
import {
  AlertTriangle, CheckCircle2, Info, Users, CalendarDays, TrendingUp,
  MessageCircle, Flame, FileText, PenTool, Megaphone, Bot,
  Clock, ArrowRight,
} from "lucide-react";
import type { DashboardAlert, DashboardKPI, AgendaItem } from "@/app/actions/dashboard";

const ALERT_STYLES = {
  urgent: { bg: "bg-red-50 border-red-200", icon: AlertTriangle, iconColor: "text-red-500", badge: "bg-red-100 text-red-700" },
  warning: { bg: "bg-amber-50 border-amber-200", icon: Info, iconColor: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
  positive: { bg: "bg-green-50 border-green-200", icon: CheckCircle2, iconColor: "text-green-500", badge: "bg-green-100 text-green-700" },
};

const AGENDA_ICONS = { post: PenTool, lead: Users, broadcast: Megaphone, task: Clock };
const AGENDA_STATUS_COLOR = { done: "text-green-500", upcoming: "text-blue-500", pending: "text-amber-500" };

export function IntelligentDashboard({ data }: { data: { alerts: DashboardAlert[]; kpis: DashboardKPI; agenda: AgendaItem[] } }) {
  const { alerts, kpis, agenda } = data;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const style = ALERT_STYLES[alert.type];
            const Icon = style.icon;
            return (
              <div key={alert.id} className={`border rounded-xl p-3 flex items-start gap-3 ${style.bg}`}>
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${style.badge}`}>
                      {alert.type === "urgent" ? "URGENTE" : alert.type === "warning" ? "ATENCAO" : "POSITIVO"}
                    </span>
                    <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.description}</p>
                </div>
                {alert.action && (
                  <Link href={alert.action.href} className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm">
                    {alert.action.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Leads hoje", value: kpis.leadsToday, icon: Users, color: "text-blue-600 bg-blue-50", href: "/dashboard/pipeline" },
          { label: "Leads quentes", value: kpis.hotLeads, icon: Flame, color: "text-red-600 bg-red-50", href: "/dashboard/pipeline" },
          { label: "Clientes (mes)", value: kpis.clientsThisMonth, icon: TrendingUp, color: "text-green-600 bg-green-50", href: "/dashboard/analytics" },
          { label: "Posts (semana)", value: kpis.publishedPostsWeek, icon: PenTool, color: "text-violet-600 bg-violet-50", href: "/dashboard/social/posts" },
        ].map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="bg-white border border-slate-100 rounded-xl p-3 hover:shadow-sm transition-all group">
            <div className="flex items-center justify-between mb-1">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            <p className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Second row: more KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Chats ativos", value: kpis.activeChats, icon: MessageCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Agendados hoje", value: kpis.scheduledToday, icon: CalendarDays, color: "text-indigo-600 bg-indigo-50" },
          { label: "Rascunhos", value: kpis.draftPosts, icon: FileText, color: "text-slate-600 bg-slate-50" },
          { label: "Score medio", value: `${kpis.avgScore}/100`, icon: TrendingUp, color: "text-amber-600 bg-amber-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-[11px] text-slate-400">{kpi.label}</p>
            </div>
            <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Bottom: Agenda + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Agenda */}
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" /> Agenda de Hoje
          </h3>
          {agenda.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhum item agendado para hoje</p>
          ) : (
            <div className="space-y-2">
              {agenda.map((item, i) => {
                const Icon = AGENDA_ICONS[item.type] || Clock;
                const statusColor = AGENDA_STATUS_COLOR[item.status];
                return (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-slate-400 w-12 shrink-0">{item.time}</span>
                    <Icon className={`h-4 w-4 shrink-0 ${statusColor}`} />
                    <span className="text-sm text-slate-700 flex-1 truncate">{item.title}</span>
                    {item.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <h3 className="font-semibold text-slate-900 text-sm mb-3">Acoes Rapidas</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Perguntar a IA", href: "/dashboard/chat/assistant", icon: Bot, color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
              { label: "Criar Post", href: "/dashboard/social/calendar", icon: PenTool, color: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
              { label: "Ver Pipeline", href: "/dashboard/pipeline", icon: Users, color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
              { label: "Broadcast", href: "/dashboard/chat/broadcast", icon: Megaphone, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
            ].map((action) => (
              <Link key={action.label} href={action.href}
                className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
                <action.icon className="h-4 w-4" /> {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
