import { getMetaCampaigns, getPixelEvents } from "@/app/actions/meta";
import { getStages } from "@/app/actions/stages";
import { MetaPageClient } from "@/components/meta/MetaPageClient";

export default async function MetaPage() {
  const [{ campaigns, config }, { events, pixelId }, stages] = await Promise.all([
    getMetaCampaigns(),
    getPixelEvents(),
    getStages(),
  ]);

  return (
    <MetaPageClient
      campaigns={campaigns}
      hasConfig={!!config}
      pixelId={pixelId}
      events={events}
      stages={stages}
    />
  );
}
