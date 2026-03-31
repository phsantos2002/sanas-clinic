import { getStages } from "@/app/actions/stages";
import { getAttendants } from "@/app/actions/whatsappHub";
import { ManageStagesSection } from "@/components/settings/ManageStagesSection";
import { TeamClient } from "@/components/chat/TeamClient";

export default async function PipelineSettingsPage() {
  const [stages, attendants] = await Promise.all([
    getStages(),
    getAttendants(),
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Pipeline Stages */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Etapas do Pipeline</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Defina as etapas do funil e qual evento do Pixel cada coluna dispara
          </p>
        </div>
        <ManageStagesSection stages={stages} />
      </div>

      {/* Team / Attendants */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Equipe de Atendimento</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Atendentes que recebem leads por round-robin automatico
          </p>
        </div>
        <TeamClient attendants={attendants} />
      </div>
    </div>
  );
}
