import { getLeads } from "@/app/actions/leads";
import { getStages } from "@/app/actions/stages";
import { getFunnels } from "@/app/actions/funnels";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">CRM</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {leadsResult.total} leads no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateLeadModal stages={stages} />
        </div>
      </div>

      <DashboardClient leads={leads} columns={columns} stages={stages} funnels={funnels} />
    </div>
  );
}
