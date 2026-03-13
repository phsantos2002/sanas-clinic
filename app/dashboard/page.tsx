import { getLeads, getLeadSourceStats } from "@/app/actions/leads";
import { getStages } from "@/app/actions/stages";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import type { KanbanColumn } from "@/types";

export default async function DashboardPage() {
  const [leads, stages, stats] = await Promise.all([
    getLeads(),
    getStages(),
    getLeadSourceStats(),
  ]);

  const columns: KanbanColumn[] = stages.map((stage) => ({
    ...stage,
    leads: leads.filter((lead) => lead.stageId === stage.id),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{leads.length} leads no total</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateLeadModal stages={stages} />
        </div>
      </div>

      <DashboardClient leads={leads} columns={columns} stats={stats} stages={stages} />
    </div>
  );
}
