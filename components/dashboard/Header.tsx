import Link from "next/link";
import Image from "next/image";
import { BarChart2, Kanban, Settings, MessageCircle, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { WhatsAppStatus } from "@/components/dashboard/WhatsAppStatus";
import { MetaIcon, GoogleAdsIcon } from "@/components/icons/SourceIcons";

export function Header() {
  return (
    <header className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: Logo + WhatsApp */}
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Lux CRM" width={32} height={32} className="rounded-xl" />
          <div className="h-6 w-px bg-slate-200" />
          <WhatsAppStatus />
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          {[
            { href: "/dashboard/overview", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/dashboard", icon: Kanban, label: "Pipeline" },
            { href: "/dashboard/chat", icon: MessageCircle, label: "Chat" },
            { href: "/dashboard/analytics", icon: BarChart2, label: "Analytics" },
            { href: "/dashboard/meta", label: "Meta", customIcon: <MetaIcon size={16} /> },
            { href: "/dashboard/google", label: "Google", customIcon: <GoogleAdsIcon size={16} /> },
            { href: "/dashboard/settings", icon: Settings, label: "Config" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm gap-2 rounded-lg transition-all"
              >
                {item.customIcon ?? (item.icon && <item.icon className="h-4 w-4" />)}
                <span className="hidden sm:inline text-sm">{item.label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {/* Right: Logout */}
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-slate-600 gap-2 rounded-lg">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
