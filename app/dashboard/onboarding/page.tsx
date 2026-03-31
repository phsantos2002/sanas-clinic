import { isOnboardingComplete } from "@/app/actions/onboarding";
import { redirect } from "next/navigation";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export default async function OnboardingPage() {
  const complete = await isOnboardingComplete();
  if (complete) redirect("/dashboard/overview");

  return <OnboardingClient />;
}
