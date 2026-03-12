import { getLeads, getLeadSourceStats } from "@/app/actions/leads";
import { getStages } from "@/app/actions/stages";
import { getTags } from "@/app/actions/tags";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { ManageTagsModal } from "@/components/modals/ManageTagsModal";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { KanbanColumn } from "@/types";

export default async function DashboardPage() {
  const [leads, stages, tags, stats] = await Promise.all([
    getLeads(),
    getStages(),
    getTags(),
    getLeadSourceStats(),
  ]);

  const columns: KanbanColumn[] = stages.map((stage) => ({
    ...stage,
    leads: leads.filter((lead) => lead.stageId === stage.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-sm text-zinc-500">{leads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-2">
          <ManageTagsModal tags={tags} />
          <CreateLeadModal stages={stages} />
        </div>
      </div>

      <DashboardClient leads={leads} columns={columns} stats={stats} stages={stages} tags={tags} />
    </div>
  );
}
