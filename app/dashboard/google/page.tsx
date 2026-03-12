import { getGoogleLeadsData } from "@/app/actions/google";
import { getGAConfig } from "@/app/actions/ga";
import { GooglePageClient } from "@/components/google/GooglePageClient";

export default async function GooglePage() {
  const [leadsData, gaConfig] = await Promise.all([
    getGoogleLeadsData(),
    getGAConfig(),
  ]);

  return (
    <GooglePageClient
      leadsData={leadsData}
      hasGAConfig={!!gaConfig}
      measurementId={gaConfig?.measurementId ?? null}
    />
  );
}
