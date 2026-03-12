import { getAnalytics } from "@/app/actions/analytics";
import { getLeadSourceStats } from "@/app/actions/leads";
import { AnalyticsClient } from "@/components/dashboard/AnalyticsClient";

export default async function AnalyticsPage() {
  const [data, sourceStats] = await Promise.all([
    getAnalytics(),
    getLeadSourceStats(),
  ]);

  if (!data) {
    return <div className="text-center text-zinc-500 py-12">Erro ao carregar métricas.</div>;
  }

  return <AnalyticsClient data={data} sourceStats={sourceStats} />;
}
