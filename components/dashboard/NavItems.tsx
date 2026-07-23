"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, BarChart3, MessageCircle, Calendar, BookUser } from "lucide-react";
import { MetaIcon } from "@/components/icons/SourceIcons";

// Bloco principal (Config saiu da nav — fica só na engrenagem à direita).
const navItems = [
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/pipeline", label: "CRM", icon: Kanban },
  { href: "/dashboard/contatos", label: "Contatos", icon: BookUser },
  { href: "/dashboard/calendar", label: "Calendário", icon: Calendar },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export function NavItems({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();

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
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/dashboard/meta"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
            pathname.startsWith("/dashboard/meta")
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <MetaIcon size={14} />
          <span>Ads</span>
        </Link>
      </nav>
    );
  }

  return (
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
            <item.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Logo do Meta Ads como opção standalone (fora de qualquer bloco). */
export function AdsButton() {
  const pathname = usePathname();
  const isActive = pathname.startsWith("/dashboard/meta");
  return (
    <Link
      href="/dashboard/meta"
      title="Meta Ads"
      className={`flex items-center justify-center h-10 px-3 rounded-xl transition-colors ${
        isActive ? "bg-blue-50" : "hover:bg-slate-50"
      }`}
    >
      <MetaIcon size={32} />
    </Link>
  );
}
