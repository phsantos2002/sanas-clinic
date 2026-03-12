import Link from "next/link";
import Image from "next/image";
import { BarChart2, Kanban, Settings, MessageCircle, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { WhatsAppStatus } from "@/components/dashboard/WhatsAppStatus";

export function Header() {
  return (
    <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Sanas Clinic" width={32} height={32} className="rounded-lg" />
          <div className="h-5 w-px bg-slate-200" />
          <WhatsAppStatus />
        </div>

        <nav className="flex items-center gap-0.5">
          {[
            { href: "/dashboard/overview", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/dashboard", icon: Kanban, label: "Pipeline" },
            { href: "/dashboard/chat", icon: MessageCircle, label: "Chat" },
            { href: "/dashboard/analytics", icon: BarChart2, label: "Analytics" },
            { href: "/dashboard/settings", icon: Settings, label: "Configurações" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 gap-1.5">
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-slate-600 gap-1.5">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
