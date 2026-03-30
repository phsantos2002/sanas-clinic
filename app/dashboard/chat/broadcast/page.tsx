import { getBroadcasts } from "@/app/actions/whatsappHub";
import { getStages } from "@/app/actions/stages";
import { BroadcastClient } from "@/components/chat/BroadcastClient";

export default async function BroadcastPage() {
  const [broadcasts, stages] = await Promise.all([getBroadcasts(), getStages()]);
  return <BroadcastClient broadcasts={broadcasts} stages={stages} />;
}
