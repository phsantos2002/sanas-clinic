import { getAnalytics, getAdCreativeReport } from "@/app/actions/analytics";
import { getLeadSourceStats } from "@/app/actions/leads";
import { getCurrentUser } from "@/app/actions/user";
import { listCampaignsForSelector } from "@/app/actions/meta";
import { getAllCampaignConfigs } from "@/app/actions/pixel";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "@/components/dashboard/AnalyticsClient";
import { AdCreativeReportTable } from "@/components/dashboard/AdCreativeReportTable";

export default async function AnalyticsPage() {
  const [data, sourceStats, creatives, user] = await Promise.all([
    getAnalytics(),
    getLeadSourceStats(),
    getAdCreativeReport(),
    getCurrentUser(),
  ]);

  if (!data) {
    return <div className="text-center text-zinc-500 py-12">Erro ao carregar métricas.</div>;
  }

  let pixelConfig: {
    bidStrategy: string | null;
    campaignObjective: string | null;
    businessSegment: string | null;
    coverageArea: string | null;
    conversionValue: number | null;
  } | null = null;

  // Fetch campaigns list and per-campaign configs for selector
  const [campaignsList, campaignConfigs] = await Promise.all([
    listCampaignsForSelector(),
    getAllCampaignConfigs(),
  ]);

  if (user) {
    const pixel = await prisma.pixel.findUnique({
      where: { userId: user.id },
      select: { bidStrategy: true, campaignObjective: true, businessSegment: true, coverageArea: true, conversionValue: true },
    });
    if (pixel) {
      pixelConfig = {
        bidStrategy: pixel.bidStrategy ?? null,
        campaignObjective: pixel.campaignObjective ?? null,
        businessSegment: pixel.businessSegment ?? null,
        coverageArea: pixel.coverageArea ?? null,
        conversionValue: pixel.conversionValue ?? null,
      };
    }
  }

  // Build config map for campaign selector
  const configMap: Record<string, { bidStrategy: string | null; campaignObjective: string | null; businessSegment: string | null }> = {};
  for (const cfg of campaignConfigs) {
    configMap[cfg.campaignId] = {
      bidStrategy: cfg.bidStrategy ?? null,
      campaignObjective: cfg.campaignObjective ?? null,
      businessSegment: cfg.businessSegment ?? null,
    };
  }

  return (
    <div className="space-y-8">
      <AnalyticsClient
        data={data}
        sourceStats={sourceStats}
        pixelConfig={pixelConfig}
        campaignsList={campaignsList}
        campaignConfigMap={configMap}
      />
      {creatives.length > 0 && <AdCreativeReportTable creatives={creatives} />}
    </div>
  );
}
