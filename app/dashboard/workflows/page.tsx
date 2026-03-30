import { getWorkflows } from "@/app/actions/workflows";
import { getStages } from "@/app/actions/stages";
import { WorkflowsClient } from "@/components/workflows/WorkflowsClient";

export default async function WorkflowsPage() {
  const [workflows, stages] = await Promise.all([
    getWorkflows(),
    getStages(),
  ]);

  return <WorkflowsClient workflows={workflows} stages={stages} />;
}
