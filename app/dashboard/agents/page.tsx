import { getAgents, getAgentChats } from "@/app/actions/aiAgents";
import { AgentsClient } from "@/components/agents/AgentsClient";

export default async function AgentsPage() {
  const [agents, recentChats] = await Promise.all([
    getAgents(),
    getAgentChats(),
  ]);

  return <AgentsClient agents={agents} recentChats={recentChats} />;
}
