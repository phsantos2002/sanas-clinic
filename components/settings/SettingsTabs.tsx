"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Kanban,
  Sparkles,
  User,
  Users,
  Users2,
  ShieldCheck,
  Briefcase,
  Smartphone,
  Workflow,
} from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  logo?: string;
  exact?: boolean;
};

// Agrupado pra leitura de leigo: primeiro o negócio, depois o atendimento,
// por último o avançado.
const groups: { title: string; tabs: Tab[] }[] = [
  {
    title: "Seu negócio",
    tabs: [
      { href: "/dashboard/settings/business", label: "Meu Negocio", icon: Briefcase },
      { href: "/dashboard/settings/connections", label: "WhatsApp", icon: Smartphone },
    ],
  },
  {
    title: "Atendimento",
    tabs: [
      { href: "/dashboard/settings/ai", label: "IA Sanas", icon: Sparkles },
      { href: "/dashboard/settings/flows", label: "Fluxo", icon: Workflow },
      { href: "/dashboard/settings/pipeline", label: "Funil", icon: Kanban },
      { href: "/dashboard/settings/queues", label: "Setores", icon: Users2 },
      { href: "/dashboard/settings/team", label: "Equipe", icon: Users },
    ],
  },
  {
    title: "Avançado",
    tabs: [
      { href: "/dashboard/settings/integrations", label: "Meta Ads", logo: "/icons/meta.svg" },
      { href: "/dashboard/settings/system", label: "Sistema", icon: ShieldCheck },
      { href: "/dashboard/settings/account", label: "Conta", icon: User },
    ],
  },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 overflow-x-auto">
      {groups.map((group, gi) => (
        <div key={group.title} className="flex items-center gap-1">
          {gi > 0 && <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />}
          <span className="hidden xl:inline text-[10px] font-semibold uppercase tracking-wide text-slate-300 px-1 shrink-0">
            {group.title}
          </span>
          {group.tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.logo ? (
                  <Image src={tab.logo} alt={tab.label} width={16} height={16} />
                ) : Icon ? (
                  <Icon className="h-4 w-4" />
                ) : null}
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
