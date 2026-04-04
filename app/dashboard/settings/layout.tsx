"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, Plug, Zap, Kanban, Brain, User, Briefcase } from "lucide-react";

const tabs = [
  { href: "/dashboard/settings", label: "Negocio", icon: Building, exact: true },
  { href: "/dashboard/settings/integrations", label: "Integracoes", icon: Plug },
  { href: "/dashboard/settings/ai", label: "IA Chat", icon: Brain },
  { href: "/dashboard/settings/services", label: "Servicos", icon: Briefcase },
  { href: "/dashboard/settings/automations", label: "Automacoes", icon: Zap },
  { href: "/dashboard/settings/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/dashboard/settings/account", label: "Conta", icon: User },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Configuracoes</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Gerencie seu negocio, integracoes, automacoes e conta</p>
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
