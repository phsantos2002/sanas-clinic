import { Header } from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />
      <main className="max-w-screen-2xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
