import { getAttendants } from "@/app/actions/whatsappHub";
import { TeamClient } from "@/components/chat/TeamClient";

export default async function SettingsUsersPage() {
  const attendants = await getAttendants();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Usuarios</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Crie acessos de Administrador, Gerente, Vendedor e CS (Customer Success).
        </p>
      </div>
      <TeamClient attendants={attendants} />
    </div>
  );
}
