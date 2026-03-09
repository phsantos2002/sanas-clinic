import { Header } from "@/components/dashboard/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="max-w-screen-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
