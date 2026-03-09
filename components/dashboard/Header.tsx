import Link from "next/link";
import Image from "next/image";
import { BarChart2, Kanban, Settings, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Image src="/logo.png" alt="Sanas Clinic" width={36} height={36} />
        </div>

        <nav className="flex items-center gap-1">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <Kanban className="h-4 w-4" />
              Pipeline
            </Button>
          </Link>
          <Link href="/dashboard/chat">
            <Button variant="ghost" size="sm">
              <MessageCircle className="h-4 w-4" />
              Chat
            </Button>
          </Link>
          <Link href="/dashboard/analytics">
            <Button variant="ghost" size="sm">
              <BarChart2 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
          </Link>
        </nav>

        <form action={signOut}>
          <Button variant="outline" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
