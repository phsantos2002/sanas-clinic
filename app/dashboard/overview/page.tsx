import { redirect } from "next/navigation";
import { getDashboardStats } from "@/app/actions/leads";
import { getDashboardIntelligence } from "@/app/actions/dashboard";
import { isOnboardingComplete } from "@/app/actions/onboarding";
import { hasTutorialBeenSeen } from "@/app/actions/tutorial";
import { DashboardOverviewClient } from "@/components/dashboard/DashboardOverviewClient";
import { IntelligentDashboard } from "@/components/dashboard/IntelligentDashboard";
import { DailyBrief } from "@/components/dashboard/DailyBrief";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { HealthScore } from "@/components/dashboard/HealthScore";
import { TutorialGate } from "@/components/onboarding/TutorialGate";

export default async function OverviewPage() {
  const onboarded = await isOnboardingComplete();
  if (!onboarded) redirect("/dashboard/onboarding");

  const [stats, intelligence, tutorialSeen] = await Promise.all([
    getDashboardStats(),
    getDashboardIntelligence(),
    hasTutorialBeenSeen(),
  ]);

  return (
    <div className="space-y-6">
      <TutorialGate shouldShow={!tutorialSeen} />
      <DailyBrief />
      {intelligence && <IntelligentDashboard data={intelligence} />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <TodaysTasks />
          <ActivityFeed />
        </div>
        <div>
          <HealthScore />
        </div>
      </div>
      <DashboardOverviewClient initialStats={stats} />
    </div>
  );
}
