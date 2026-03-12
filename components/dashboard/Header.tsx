import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { WhatsAppStatus } from "@/components/dashboard/WhatsAppStatus";
import { NavItems } from "@/components/dashboard/NavItems";

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
        <NavItems />

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
