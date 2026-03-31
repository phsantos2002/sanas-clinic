import Link from "next/link";
import Image from "next/image";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { SystemStatus } from "@/components/dashboard/WhatsAppStatus";
import { NavItems } from "@/components/dashboard/NavItems";

export function Header() {
  return (
    <header className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      {/* Desktop header */}
      <div className="hidden md:flex max-w-screen-2xl mx-auto px-6 h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Sanas Clinic" width={32} height={32} className="rounded-lg object-contain" />
          <div className="h-6 w-px bg-slate-200" />
          <SystemStatus />
        </div>
        <NavItems />
        <div className="flex items-center gap-1">
          <Link href="/dashboard/settings/account">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 gap-1.5 rounded-lg">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-red-500 gap-1.5 rounded-lg">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Sanas Clinic" width={28} height={28} className="rounded-lg object-contain" />
            <SystemStatus />
          </div>
          <div className="flex items-center gap-0.5">
            <Link href="/dashboard/settings/account">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600 h-8 w-8 p-0 rounded-lg">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-red-500 h-8 w-8 p-0 rounded-lg">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-hide border-t border-slate-50">
          <NavItems mobile />
        </div>
      </div>
    </header>
  );
}
