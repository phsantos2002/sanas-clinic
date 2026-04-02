"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Bot, FileText, Megaphone, Users } from "lucide-react";

const chatTabs = [
  { href: "/dashboard/chat", label: "WhatsApp", icon: MessageCircle, exact: true },
  { href: "/dashboard/chat/assistant", label: "Assistente IA", icon: Bot },
  { href: "/dashboard/chat/templates", label: "Templates", icon: FileText },
  { href: "/dashboard/chat/broadcast", label: "Broadcast", icon: Megaphone },
  { href: "/dashboard/chat/team", label: "Equipe", icon: Users },
];

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-3">
      <nav className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 overflow-x-auto flex-shrink-0">
        {chatTabs.map((tab) => {
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
      {children}
    </div>
  );
}
