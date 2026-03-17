import { getAnalytics, getAdCreativeReport } from "@/app/actions/analytics";
import { getLeadSourceStats } from "@/app/actions/leads";
import { AnalyticsClient } from "@/components/dashboard/AnalyticsClient";
import { AdCreativeReportTable } from "@/components/dashboard/AdCreativeReportTable";

export default async function AnalyticsPage() {
  const [data, sourceStats, creatives] = await Promise.all([
    getAnalytics(),
    getLeadSourceStats(),
    getAdCreativeReport(),
  ]);

  if (!data) {
    return <div className="text-center text-zinc-500 py-12">Erro ao carregar métricas.</div>;
  }

  return (
    <div className="space-y-8">
      <AnalyticsClient data={data} sourceStats={sourceStats} />
      {creatives.length > 0 && <AdCreativeReportTable creatives={creatives} />}
    </div>
  );
}
