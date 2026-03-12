import { getDashboardStats } from "@/app/actions/leads";
import { DashboardOverviewClient } from "@/components/dashboard/DashboardOverviewClient";

export default async function OverviewPage() {
  const stats = await getDashboardStats();

  return <DashboardOverviewClient initialStats={stats} />;
}
