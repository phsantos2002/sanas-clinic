"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Bot, FileText, Megaphone, Users } from "lucide-react";

const ALL_TABS = [
  { href: "/dashboard/chat", label: "WhatsApp", icon: MessageCircle, exact: true, key: "whatsapp" },
  {
    href: "/dashboard/chat/assistant",
    label: "Assistente IA",
    icon: Bot,
    exact: false,
    key: "assistant",
  },
  {
    href: "/dashboard/chat/templates",
    label: "Templates",
    icon: FileText,
    exact: false,
    key: "templates",
  },
  {
    href: "/dashboard/chat/broadcast",
    label: "Broadcast",
    icon: Megaphone,
    exact: false,
    key: "broadcast",
  },
  { href: "/dashboard/chat/team", label: "Equipe", icon: Users, exact: false, key: "team" },
];

export function ChatTabsNav({ visibleTabs }: { visibleTabs: string[] }) {
  const pathname = usePathname();

  // Always show WhatsApp (conversations). Extras filtered by settings.
  const tabs = ALL_TABS.filter((t) => t.key === "whatsapp" || visibleTabs.includes(t.key));

  // If user disabled all extras, hide the entire nav bar
  if (tabs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 overflow-x-auto flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
