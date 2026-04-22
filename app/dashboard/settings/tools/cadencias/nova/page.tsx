import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CadenceBuilder } from "@/components/prospeccao/CadenceBuilder";

export default function NovaCadenciaPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/settings/tools"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ChevronLeft className="h-4 w-4" /> Ferramentas
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova Cadência</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monte uma sequência de toques para prospectar leads frios.
        </p>
      </div>

      <CadenceBuilder />
    </div>
  );
}
