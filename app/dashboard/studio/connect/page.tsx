import { getSocialConnections } from "@/app/actions/social";
import { ConnectPlatformsClient } from "@/components/social/ConnectPlatformsClient";

export default async function StudioConnectPage() {
  const connections = await getSocialConnections();
  return <ConnectPlatformsClient connections={connections} />;
}
