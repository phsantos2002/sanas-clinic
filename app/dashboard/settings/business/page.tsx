import { getBusinessProfile } from "@/app/actions/businessProfile";
import { getServices } from "@/app/actions/services";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { ServicesManager } from "@/components/settings/ServicesManager";

export default async function BusinessSettingsPage() {
  const [profile, services] = await Promise.all([getBusinessProfile(), getServices()]);

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      {/* Dados da empresa */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Dados da empresa</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Informacoes que a IA usa pra responder perguntas de clientes (endereco, horario, PIX,
            contato). Tambem aparecem na agenda e em comunicacoes.
          </p>
        </div>
        <BusinessProfileForm initial={profile} />
      </div>

      {/* Servicos */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Servicos</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cadastre seus servicos para a IA informar precos, duracao e auxiliar no agendamento
          </p>
        </div>
        <ServicesManager initialServices={services} />
      </div>

      {/* A agenda agora é nativa: os agendamentos da IA aparecem direto na aba
          Calendário — sem necessidade de conectar Google Calendar. */}
    </div>
  );
}
