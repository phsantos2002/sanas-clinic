import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCadence } from "@/app/actions/cadences";
import { CadenceBuilder } from "@/components/prospeccao/CadenceBuilder";

export default async function EditCadenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cadence = await getCadence(id);
  if (!cadence) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/prospeccao/cadencias"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" /> Cadências
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Editar Cadência</h1>
        <p className="text-sm text-slate-500 mt-1">{cadence.enrolledCount} leads inscritos no total.</p>
      </div>

      <CadenceBuilder
        initial={{
          id: cadence.id,
          name: cadence.name,
          description: cadence.description,
          stopOnReply: cadence.stopOnReply,
          isActive: cadence.isActive,
          steps: cadence.steps,
        }}
      />
    </div>
  );
}
