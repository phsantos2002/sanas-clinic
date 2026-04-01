import { getAnalytics, getAdCreativeReport } from "@/app/actions/analytics";
import { getLeadSourceStats } from "@/app/actions/leads";
import { getCurrentUser } from "@/app/actions/user";
import { listCampaignsForSelector } from "@/app/actions/meta";
import { getAllCampaignConfigs } from "@/app/actions/pixel";
import { getAdvancedFunnel, getLTVBySource, getCACByChannel, getScoreDistribution, getAIUsageReport } from "@/app/actions/advancedAnalytics";
import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "@/components/dashboard/AnalyticsClient";
import { AdCreativeReportTable } from "@/components/dashboard/AdCreativeReportTable";
import { AdvancedAnalyticsSection } from "@/components/dashboard/AdvancedAnalyticsSection";
import { AnalyticsNarrative } from "@/components/dashboard/AnalyticsNarrative";

export default async function AnalyticsPage() {
  const [data, sourceStats, creatives, user, funnel, ltv, cac, scores, aiUsage] = await Promise.all([
    getAnalytics(),
    getLeadSourceStats(),
    getAdCreativeReport(),
    getCurrentUser(),
    getAdvancedFunnel(),
    getLTVBySource(),
    getCACByChannel(),
    getScoreDistribution(),
    getAIUsageReport(),
  ]);

  if (!data) {
    return <div className="text-center text-zinc-500 py-12">Erro ao carregar metricas.</div>;
  }

  let pixelConfig: {
    bidStrategy: string | null;
    campaignObjective: string | null;
    businessSegment: string | null;
    coverageArea: string | null;
    conversionValue: number | null;
  } | null = null;

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
      <AnalyticsNarrative />
      <AnalyticsClient
        data={data}
        sourceStats={sourceStats}
        pixelConfig={pixelConfig}
        campaignsList={campaignsList}
        campaignConfigMap={configMap}
      />
      {creatives.length > 0 && <AdCreativeReportTable creatives={creatives} />}

      {/* Advanced Analytics */}
      <AdvancedAnalyticsSection
        funnel={funnel}
        ltv={ltv}
        cac={cac}
        scores={scores}
        aiUsage={aiUsage}
      />
    </div>
  );
}
