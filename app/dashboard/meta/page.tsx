import { getMetaCampaigns, getSelectedCampaignData, getPixelEvents } from "@/app/actions/meta";
import { getStages } from "@/app/actions/stages";
import { getCurrentUser } from "@/app/actions/user";
import { getAllCampaignConfigs } from "@/app/actions/pixel";
import { prisma } from "@/lib/prisma";
import { MetaPageClient } from "@/components/meta/MetaPageClient";
import { MetaDiagnosis } from "@/components/meta/MetaDiagnosis";

export default async function MetaPage() {
  const [{ campaigns, config }, selectedData, { events, pixelId }, stages, user] =
    await Promise.all([
      getMetaCampaigns(),
      getSelectedCampaignData(),
      getPixelEvents(),
      getStages(),
      getCurrentUser(),
    ]);

  let accountPhase: string | null = null;
  let bidStrategy: string | null = null;
  let conversionDestination: string | null = null;
  let campaignConfigs: Awaited<ReturnType<typeof getAllCampaignConfigs>> = [];

  if (user) {
    const [pixel, configs] = await Promise.all([
      prisma.pixel.findUnique({
        where: { userId: user.id },
        select: { accountPhase: true, bidStrategy: true, conversionDestination: true },
      }),
      getAllCampaignConfigs(),
    ]);
    if (pixel) {
      accountPhase = pixel.accountPhase ?? null;
      bidStrategy = pixel.bidStrategy ?? null;
      conversionDestination = pixel.conversionDestination ?? null;
    }
    campaignConfigs = configs;
  }

  return (
    <div className="space-y-6">
      <MetaDiagnosis />
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
        userId={user?.id}
        campaignConfigs={campaignConfigs}
      />
    </div>
  );
}
