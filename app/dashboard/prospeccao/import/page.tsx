import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getAttendants } from "@/app/actions/whatsappHub";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";
import { CsvImportClient } from "@/components/prospeccao/CsvImportClient";

export default async function ImportPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [attendants, stages] = await Promise.all([
    getAttendants(),
    prisma.stage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/prospeccao"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" /> Prospecção
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Importar Leads (CSV)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Traga uma lista fria para prospecção outbound.
        </p>
      </div>

      <CsvImportClient
        attendants={attendants.map((a) => ({ id: a.id, name: a.name, role: a.role }))}
        stages={stages}
      />
    </div>
  );
}
