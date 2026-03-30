"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Images, Link2, BarChart3, Clapperboard } from "lucide-react";

const subNavItems = [
  { href: "/dashboard/social/calendar", label: "Calendario", icon: CalendarDays },
  { href: "/dashboard/social/posts", label: "Posts", icon: Images },
  { href: "/dashboard/social/studio", label: "Studio", icon: Clapperboard },
  { href: "/dashboard/social/connect", label: "Conexoes", icon: Link2 },
  { href: "/dashboard/social/analytics", label: "Analytics", icon: BarChart3 },
];

export function SocialSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1">
      {subNavItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
