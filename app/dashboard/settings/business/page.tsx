import { getBusinessProfile } from "@/app/actions/businessProfile";
import { getServices } from "@/app/actions/services";
import { getCalendarConfig } from "@/app/actions/calendar";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";
import { ServicesManager } from "@/components/settings/ServicesManager";
import { CalendarConfig } from "@/components/settings/CalendarConfig";

// URL de gestão de env vars desse projeto Vercel. Hardcoded por simplicidade
// — se mudar de projeto, atualizar aqui.
const VERCEL_ENV_URL =
  "https://vercel.com/pedro-henriques-projects-c54468f6/sanas-pulse/settings/environment-variables";

export default async function BusinessSettingsPage() {
  const [profile, services, calendarConfig] = await Promise.all([
    getBusinessProfile(),
    getServices(),
    getCalendarConfig(),
  ]);

  // Detecta se as credenciais OAuth do Google Cloud foram configuradas.
  // Sem isso a tela de "Conectar Google Calendar" daria erro 500 — em vez
  // disso renderizamos o setup wizard inline.
  const googleCloudConfigured = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sanas-pulse.vercel.app";
  const redirectUri = `${appUrl}/api/auth/google-calendar/callback`;

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
        <CalendarConfig
          config={calendarConfig}
          setup={{
            googleCloudConfigured,
            redirectUri,
            vercelEnvUrl: VERCEL_ENV_URL,
          }}
        />
      </div>
    </div>
  );
}
