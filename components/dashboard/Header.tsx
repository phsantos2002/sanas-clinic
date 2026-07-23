import Link from "next/link";
import Image from "next/image";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import { NavItems, AdsButton } from "@/components/dashboard/NavItems";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { SearchButton } from "@/components/dashboard/SearchButton";

export function Header() {
  return (
    <header className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      {/* Desktop header — 3 colunas: logo à esquerda, nav+Meta centralizados,
          ações à direita. flex-1 nas laterais mantém o miolo centrado e a
          barra proporcionalmente ocupada. */}
      <div className="hidden md:flex max-w-screen-2xl mx-auto px-6 h-14 items-center gap-4">
        <div className="flex-1 flex items-center justify-start">
          <Image
            src="/logo.png"
            alt="Sanas Pulse"
            width={34}
            height={34}
            className="rounded-lg object-contain shrink-0"
          />
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <NavItems />
          {/* Meta Ads: logo standalone entre a nav e as ações */}
          <AdsButton />
        </div>
        <div className="flex-1 flex items-center justify-end gap-1">
          <SearchButton />
          <NotificationCenter />
          <Link href="/dashboard/settings/business">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600 gap-1.5 rounded-lg"
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <form action={signOut}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-slate-400 hover:text-red-500 gap-1.5 rounded-lg"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 h-12">
          <Image
            src="/logo.png"
            alt="Sanas Pulse"
            width={28}
            height={28}
            className="rounded-lg object-contain"
          />
          <div className="flex items-center gap-0.5">
            <NotificationCenter />
            <Link href="/dashboard/settings/business">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-600 h-8 w-8 p-0 rounded-lg"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="text-slate-400 hover:text-red-500 h-8 w-8 p-0 rounded-lg"
              >
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
