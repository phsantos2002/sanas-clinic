import { getBusinessProfile } from "@/app/actions/businessProfile";
import { getServices } from "@/app/actions/services";
import { getCalendarConfig } from "@/app/actions/calendar";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { ServicesManager } from "@/components/settings/ServicesManager";
import { CalendarConfig } from "@/components/settings/CalendarConfig";

export default async function BusinessSettingsPage() {
  const [profile, services, calendarConfig] = await Promise.all([
    getBusinessProfile(),
    getServices(),
    getCalendarConfig(),
  ]);

  return (
    <div className="space-y-4 max-w-3xl">
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

      {/* Google Calendar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Google Calendar</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Conecte para agendamento automatico via WhatsApp e exibicao na aba Calendario
          </p>
        </div>
        <CalendarConfig config={calendarConfig} />
      </div>
    </div>
  );
}
