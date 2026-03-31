import { getDashboardStats } from "@/app/actions/leads";
import { getDashboardIntelligence } from "@/app/actions/dashboard";
import { DashboardOverviewClient } from "@/components/dashboard/DashboardOverviewClient";
import { IntelligentDashboard } from "@/components/dashboard/IntelligentDashboard";

export default async function OverviewPage() {
  const [stats, intelligence] = await Promise.all([
    getDashboardStats(),
    getDashboardIntelligence(),
  ]);

  return (
    <div className="space-y-6">
      {intelligence && <IntelligentDashboard data={intelligence} />}
      <DashboardOverviewClient initialStats={stats} />
    </div>
  );
}
