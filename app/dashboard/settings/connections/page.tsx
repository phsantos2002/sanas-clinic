import { getConnections } from "@/app/actions/connections";
import { getAttendants } from "@/app/actions/whatsappHub";
import { ConnectionsClient } from "@/components/settings/ConnectionsClient";

export default async function ConnectionsPage() {
  const [connections, attendants] = await Promise.all([getConnections(), getAttendants()]);

  return <ConnectionsClient connections={connections} attendants={attendants} />;
}
