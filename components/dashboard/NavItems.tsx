"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban, BarChart3, MessageCircle, Settings, Share2 } from "lucide-react";
import { MetaIcon } from "@/components/icons/SourceIcons";

const navItems = [
  { href: "/dashboard/overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/meta", label: "Meta", iconCustom: <MetaIcon size={16} /> },
  { href: "/dashboard/social", label: "Social", icon: Share2 },
  { href: "/dashboard/settings", label: "Config", icon: Settings },
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
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {item.iconCustom ?? (item.icon && <item.icon className="h-3.5 w-3.5" />)}
              <span>{item.label}</span>
            </Link>
          );
        })}
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
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {item.iconCustom ?? (item.icon && <item.icon className="h-4 w-4" />)}
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
