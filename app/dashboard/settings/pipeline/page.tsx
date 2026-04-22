import { getStages } from "@/app/actions/stages";
import { getAttendants } from "@/app/actions/whatsappHub";
import { getStageWorkflowCounts } from "@/app/actions/workflows";
import { getFunnels } from "@/app/actions/funnels";
import { FunnelsManager } from "@/components/settings/FunnelsManager";

export default async function PipelineSettingsPage() {
  // getFunnels() lazily creates the default funnel and adopts orphan stages.
  const funnels = await getFunnels();
  const [stages, attendants, stageWorkflowCounts] = await Promise.all([
    getStages(),
    getAttendants(),
    getStageWorkflowCounts(),
  ]);

  return (
    <div className="max-w-2xl">
      <FunnelsManager
        funnels={funnels}
        stages={stages}
        attendants={attendants}
        stageWorkflowCounts={stageWorkflowCounts}
      />
    </div>
  );
}
