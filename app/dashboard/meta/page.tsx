import { getMetaCampaigns, getSelectedCampaignData, getPixelEvents } from "@/app/actions/meta";
import { getStages } from "@/app/actions/stages";
import { MetaPageClient } from "@/components/meta/MetaPageClient";

export default async function MetaPage() {
  const [
    { campaigns, config },
    selectedData,
    { events, pixelId },
    stages,
  ] = await Promise.all([
    getMetaCampaigns(),
    getSelectedCampaignData(),
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
      selectedCampaign={selectedData.campaign}
      selectedAdSets={selectedData.adSets}
      selectedInsights={selectedData.insights}
      selectedCampaignId={selectedData.selectedCampaignId}
    />
  );
}
