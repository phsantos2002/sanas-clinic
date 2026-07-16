import { redirect } from "next/navigation";
import { resolveSession } from "@/app/actions/user";
import { isRestrictedRole } from "@/lib/session";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Configurações são área do dono/gestão — vendedor/cs não entram aqui.
  const ctx = await resolveSession();
  if (!ctx) redirect("/login");
  if (isRestrictedRole(ctx.role)) redirect("/dashboard/chat");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Configuracoes</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Gerencie seu negocio, integracoes, automacoes e conta
        </p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
