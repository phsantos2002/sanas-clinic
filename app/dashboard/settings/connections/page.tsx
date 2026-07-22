import { getConnections } from "@/app/actions/connections";
import { getAttendants } from "@/app/actions/whatsappHub";
import { getWhatsAppConfig as getOfficialConfig } from "@/app/actions/whatsapp";
import { ConexaoClient } from "@/components/settings/ConexaoClient";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const [connections, attendants, officialConfig] = await Promise.all([
    getConnections(),
    getAttendants(),
    getOfficialConfig(),
  ]);

  return (
    <ConexaoClient
      connections={connections}
      attendants={attendants}
      officialConfig={officialConfig}
    />
  );
}
