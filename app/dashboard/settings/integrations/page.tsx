import { getPixel } from "@/app/actions/pixel";
import { FacebookPixelForm } from "@/components/forms/FacebookPixelForm";

export default async function IntegrationsPage() {
  const pixel = await getPixel();

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Meta Pixel + Ads */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Meta Ads &amp; Pixel</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Pixel ID, Access Token e conta de anuncios. A conexao do WhatsApp foi para a aba{" "}
            <a href="/dashboard/settings/connections" className="text-indigo-600 font-medium">
              Conexao
            </a>
            .
          </p>
        </div>
        <FacebookPixelForm pixel={pixel} />
      </div>
    </div>
  );
}
