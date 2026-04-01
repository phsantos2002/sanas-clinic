import { Header } from "@/components/dashboard/Header";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { SetupChecklist } from "@/components/onboarding/SetupChecklist";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      <CommandPalette />
      <main className="max-w-screen-2xl mx-auto px-4 py-4 md:px-6 md:py-8">{children}</main>
      <SetupChecklist />
    </div>
  );
}
