import { getLeads } from "@/app/actions/leads";
import { getStages } from "@/app/actions/stages";
import { getFunnels } from "@/app/actions/funnels";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { KanbanColumn } from "@/types";

export default async function PipelinePage() {
  // getFunnels() lazily creates "Principal" and adopts orphan stages.
  const funnels = await getFunnels().catch(() => []);
  const [leadsResult, stagesRaw] = await Promise.all([
    getLeads().catch(() => ({ leads: [], total: 0 })),
    getStages().catch(() => []),
  ]);

  const leads = leadsResult?.leads ?? [];
  const stages = stagesRaw ?? [];

  const columns: KanbanColumn[] = stages.map((stage) => ({
    ...stage,
    leads: leads.filter((lead) => lead.stageId === stage.id),
  }));

  // Cancel the dashboard layout's vertical padding + drop the page title.
  // Lead count and "+ Novo Lead" now live in the filter bar itself.
  return (
    <div className="flex flex-col gap-4 -mt-4 md:-mt-8">
      <DashboardClient leads={leads} columns={columns} stages={stages} funnels={funnels} />
    </div>
  );
}
