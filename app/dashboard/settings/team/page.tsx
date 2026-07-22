import { getAttendants } from "@/app/actions/whatsappHub";
import { getFunnels } from "@/app/actions/funnels";
import { getStages } from "@/app/actions/stages";
import { getConnections } from "@/app/actions/connections";
import { getQueues } from "@/app/actions/queues";
import { TeamClient } from "@/components/chat/TeamClient";

export const dynamic = "force-dynamic";

export default async function SettingsUsersPage() {
  const [attendants, funnels, stages, connections, queues] = await Promise.all([
    getAttendants(),
    getFunnels(),
    getStages(),
    getConnections(),
    getQueues(),
  ]);
  return (
    <TeamClient
      attendants={attendants}
      funnels={funnels}
      stages={stages}
      connections={connections}
      queues={queues}
    />
  );
}
