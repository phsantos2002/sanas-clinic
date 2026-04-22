import { getAnalytics, getAdCreativeReport } from "@/app/actions/analytics";
import { getLeadSourceStats } from "@/app/actions/leads";
import { getCurrentUser } from "@/app/actions/user";
import { listCampaignsForSelector } from "@/app/actions/meta";
import { getAllCampaignConfigs } from "@/app/actions/pixel";
import {
  getAdvancedFunnel,
  getLTVBySource,
  getCACByChannel,
  getScoreDistribution,
  getAIUsageReport,
} from "@/app/actions/advancedAnalytics";
import { prisma } from "@/lib/prisma";
import {
  AnalyticsClient,
  AdCreativeReportTable,
  AdvancedAnalyticsSection,
  AnalyticsNarrative,
} from "@/components/dashboard/AnalyticsDynamic";
import { OutboundPerformance } from "@/components/dashboard/OutboundPerformance";

export default async function AnalyticsPage() {
  const [data, sourceStats, creatives, user, funnel, ltv, cac, scores, aiUsage] = await Promise.all(
    [
      getAnalytics().catch(() => null),
      getLeadSourceStats().catch(() => null),
      getAdCreativeReport().catch(() => []),
      getCurrentUser().catch(() => null),
      getAdvancedFunnel().catch(() => null),
      getLTVBySource().catch(() => []),
      getCACByChannel().catch(() => []),
      getScoreDistribution().catch(() => []),
      getAIUsageReport().catch(() => null),
    ]
  );

  if (!data) {
    return (
      <div className="space-y-8">
        <AnalyticsNarrative />
        <div className="text-center text-slate-500 py-12">
          <p className="text-lg font-semibold mb-2">Sem dados de analytics</p>
          <p className="text-sm">
            Configure suas integracoes (Meta Ads, Pipeline) para ver metricas aqui.
          </p>
          <a
            href="/dashboard/settings/integrations"
            className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            Configurar integracoes
          </a>
        </div>
      </div>
    );
  }

  let pixelConfig: {
    bidStrategy: string | null;
    campaignObjective: string | null;
    businessSegment: string | null;
    coverageArea: string | null;
    conversionValue: number | null;
  } | null = null;

  const [campaignsList, campaignConfigs] = await Promise.all([
    listCampaignsForSelector().catch(() => []),
    getAllCampaignConfigs().catch(() => []),
  ]);

  if (user) {
    const pixel = await prisma.pixel.findUnique({
      where: { userId: user.id },
      select: {
        bidStrategy: true,
        campaignObjective: true,
        businessSegment: true,
        coverageArea: true,
        conversionValue: true,
      },
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

  const configMap: Record<
    string,
    { bidStrategy: string | null; campaignObjective: string | null; businessSegment: string | null }
  > = {};
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
        sourceStats={
          sourceStats ?? { total: 0, meta: 0, google: 0, whatsapp: 0, manual: 0, unknown: 0 }
        }
        pixelConfig={pixelConfig}
        campaignsList={campaignsList}
        campaignConfigMap={configMap}
      />
      {creatives.length > 0 && <AdCreativeReportTable creatives={creatives} />}

      {/* Outbound Performance (ex-Prospecção > Performance) */}
      <OutboundPerformance />

      {/* Advanced Analytics */}
      <AdvancedAnalyticsSection
        funnel={funnel ?? []}
        ltv={ltv}
        cac={cac}
        scores={
          Array.isArray(scores) ? { frio: 0, morno: 0, quente: 0, vip: 0, avgScore: 0 } : scores
        }
        aiUsage={
          aiUsage ?? {
            totalOperations: 0,
            totalCostUsd: 0,
            byOperation: [],
            byProvider: [],
            dailyCost: [],
          }
        }
      />
    </div>
  );
}
