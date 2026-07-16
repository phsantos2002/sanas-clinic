"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, BarChart3, MessageCircle, Settings, Calendar } from "lucide-react";
import { MetaIcon } from "@/components/icons/SourceIcons";

// Bloco principal: Chat abre primeiro (rota inicial do sistema).
const navItems = [
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/pipeline", label: "CRM", icon: Kanban },
  { href: "/dashboard/calendar", label: "Calendário", icon: Calendar },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Config", icon: Settings },
];

// Ads fica num bloco isolado, à direita do bloco principal.
const adsItem = { href: "/dashboard/meta", label: "Ads" };

export function NavItems({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();
  const adsActive = pathname.startsWith(adsItem.href);

  if (mobile) {
    return (
      <nav className="flex items-center gap-0.5 px-3 py-1.5 w-max min-w-full">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {item.icon && <item.icon className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div className="h-4 w-px bg-slate-200 mx-1.5 shrink-0" />
        <Link
          href={adsItem.href}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
            adsActive ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MetaIcon size={14} />
          <span>{adsItem.label}</span>
        </Link>
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <nav className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bloco isolado: Ads */}
      <nav className="flex items-center bg-slate-50 rounded-xl p-1">
        <Link
          href={adsItem.href}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            adsActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MetaIcon size={16} />
          <span className="hidden lg:inline">{adsItem.label}</span>
        </Link>
      </nav>
    </div>
  );
}
