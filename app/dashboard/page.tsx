import { getLeads } from "@/app/actions/leads";
import { getStages } from "@/app/actions/stages";
import { getTags } from "@/app/actions/tags";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { ManageTagsModal } from "@/components/modals/ManageTagsModal";
import type { KanbanColumn } from "@/types";

export default async function DashboardPage() {
  const [leads, stages, tags] = await Promise.all([
    getLeads(),
    getStages(),
    getTags(),
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

      <KanbanBoard columns={columns} />
    </div>
  );
}
