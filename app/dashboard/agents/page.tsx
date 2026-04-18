import {
  listAgents,
  getRecentReports,
  getRecentActions,
} from "@/app/actions/autonomousAgents";
import { AgentsDashboard } from "@/components/autonomousAgents/AgentsDashboard";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const [agents, reports, actions] = await Promise.all([
    listAgents(),
    getRecentReports(20),
    getRecentActions(30),
  ]);

  return <AgentsDashboard agents={agents} reports={reports} actions={actions} />;
}
