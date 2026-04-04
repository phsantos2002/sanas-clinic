import { getServices } from "@/app/actions/services";
import { ServicesManager } from "@/components/settings/ServicesManager";

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Servicos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cadastre seus servicos para a IA informar precos, duracao e auxiliar no agendamento
          </p>
        </div>
        <ServicesManager initialServices={services} />
      </div>
    </div>
  );
}
