import { getStages } from "@/app/actions/stages";
import { getAttendants } from "@/app/actions/whatsappHub";
import { getStageWorkflowCounts } from "@/app/actions/workflows";
import { ManageStagesSection } from "@/components/settings/ManageStagesSection";

export default async function PipelineSettingsPage() {
  const [stages, attendants, stageWorkflowCounts] = await Promise.all([
    getStages(),
    getAttendants(),
    getStageWorkflowCounts(),
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Pipeline Stages */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Etapas do Pipeline</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Defina as etapas do funil, eventos do Pixel e ações automáticas ao entrar
          </p>
        </div>
        <ManageStagesSection
          stages={stages}
          attendants={attendants}
          stageWorkflowCounts={stageWorkflowCounts}
        />
      </div>
    </div>
  );
}
