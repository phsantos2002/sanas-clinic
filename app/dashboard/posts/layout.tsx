"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Images, Megaphone, BarChart3 } from "lucide-react";

const tabs = [
  { href: "/dashboard/posts", label: "Calendario", icon: CalendarDays, exact: true },
  { href: "/dashboard/posts/library", label: "Biblioteca", icon: Images },
  { href: "/dashboard/posts/campaigns", label: "Campanhas WA", icon: Megaphone },
  { href: "/dashboard/posts/metrics", label: "Metricas", icon: BarChart3 },
];

export default function PostsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Postagens</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Agende, publique e gerencie conteudo em todas as plataformas</p>
      </div>
      <nav className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"
              }`}>
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
