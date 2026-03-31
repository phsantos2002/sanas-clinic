import { getContentGenSettings, getBusinessProfile, saveBusinessProfile } from "@/app/actions/brandSettings";
import { getAIConfig } from "@/app/actions/aiConfig";
import { BrandIdentityForm } from "@/components/settings/BrandIdentityForm";
import { BusinessProfileForm } from "@/components/settings/BusinessProfileForm";

export default async function SettingsBusinessPage() {
  const [contentGen, businessProfile, aiConfig] = await Promise.all([
    getContentGenSettings(),
    getBusinessProfile(),
    getAIConfig(),
  ]);

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Business Profile */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Perfil do Negocio</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Informacoes usadas pela IA para personalizar todo o conteudo
          </p>
        </div>
        <BusinessProfileForm initial={businessProfile} onSave={saveBusinessProfile} />
      </div>

      {/* Brand Identity */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Identidade Visual</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Logo, cores e fonte usados pela IA para gerar conteudo alinhado com sua marca
          </p>
        </div>
        <BrandIdentityForm initial={contentGen?.brandIdentity ?? {}} />
      </div>
    </div>
  );
}
