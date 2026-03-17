import { getMetaCampaigns, getSelectedCampaignData, getPixelEvents } from "@/app/actions/meta";
import { getStages } from "@/app/actions/stages";
import { getCurrentUser } from "@/app/actions/user";
import { getAlerts } from "@/app/actions/alerts";
import { prisma } from "@/lib/prisma";
import { MetaPageClient } from "@/components/meta/MetaPageClient";

export default async function MetaPage() {
  const [
    { campaigns, config },
    selectedData,
    { events, pixelId },
    stages,
    user,
  ] = await Promise.all([
    getMetaCampaigns(),
    getSelectedCampaignData(),
    getPixelEvents(),
    getStages(),
    getCurrentUser(),
  ]);

  let accountPhase: string | null = null;
  let bidStrategy: string | null = null;
  let conversionDestination: string | null = null;
  let campaignObjective: string | null = null;
  let alerts: Array<{ id: string; type: string; severity: string; message: string; suggestion: string; resolved: boolean; createdAt: Date }> = [];

  if (user) {
    const [pixel, userAlerts] = await Promise.all([
      prisma.pixel.findUnique({
        where: { userId: user.id },
        select: { accountPhase: true, bidStrategy: true, conversionDestination: true, campaignObjective: true },
      }),
      getAlerts(user.id),
    ]);
    if (pixel) {
      accountPhase = pixel.accountPhase ?? null;
      bidStrategy = pixel.bidStrategy ?? null;
      conversionDestination = pixel.conversionDestination ?? null;
      campaignObjective = pixel.campaignObjective ?? null;
    }
    alerts = userAlerts;
  }

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
      apiError={selectedData.error}
      accountPhase={accountPhase}
      bidStrategy={bidStrategy}
      conversionDestination={conversionDestination}
      campaignObjective={campaignObjective}
      userId={user?.id}
      initialAlerts={alerts}
    />
  );
}
