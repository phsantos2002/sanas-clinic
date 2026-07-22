import { getQueues } from "@/app/actions/queues";
import { getAttendants } from "@/app/actions/whatsappHub";
import { QueuesClient } from "@/components/settings/QueuesClient";

export const dynamic = "force-dynamic";

export default async function QueuesPage() {
  const [queues, attendants] = await Promise.all([getQueues(), getAttendants()]);
  return <QueuesClient queues={queues} attendants={attendants} />;
}
