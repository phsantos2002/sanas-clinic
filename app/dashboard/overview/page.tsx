import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/app/actions/onboarding";
import { hasTutorialBeenSeen } from "@/app/actions/tutorial";
import { getUpcomingMeetings } from "@/app/actions/overview";
import { getSDRMetrics } from "@/app/actions/sdrDashboard";
import { UpcomingMeetings } from "@/components/dashboard/UpcomingMeetings";
import { TeamPerformanceMini } from "@/components/dashboard/TeamPerformanceMini";
import { DashboardChat } from "@/components/dashboard/DashboardChat";
import { TutorialGate } from "@/components/onboarding/TutorialGate";

export default async function OverviewPage() {
  const onboarded = await isOnboardingComplete();
  if (!onboarded) redirect("/dashboard/onboarding");

  const [meetings, metrics, tutorialSeen] = await Promise.all([
    getUpcomingMeetings(),
    getSDRMetrics(),
    hasTutorialBeenSeen(),
  ]);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-4">
      <TutorialGate shouldShow={!tutorialSeen} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hoje</h1>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">{today}</p>
      </div>

      {/* Grid: 3 colunas — Reuniões | Performance | Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UpcomingMeetings meetings={meetings} />
        <TeamPerformanceMini metrics={metrics} />
        <DashboardChat />
      </div>
    </div>
  );
}
