import { getAttendants } from "@/app/actions/whatsappHub";
import { TeamClient } from "@/components/chat/TeamClient";

export default async function SettingsTeamPage() {
  const attendants = await getAttendants();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Time (SDRs / Closers)</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Gerencie papéis, metas diárias e atribuições do time de prospecção e vendas.
        </p>
      </div>
      <TeamClient attendants={attendants} />
    </div>
  );
}
