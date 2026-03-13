import { getGoogleBusinessData, getGoogleBusinessConfig } from "@/app/actions/googleBusiness";
import { getWhatsAppConfig } from "@/app/actions/whatsapp";
import { GooglePageClient } from "@/components/google/GooglePageClient";

export default async function GooglePage() {
  const [businessData, gbConfig, waConfig] = await Promise.all([
    getGoogleBusinessData(),
    getGoogleBusinessConfig(),
    getWhatsAppConfig(),
  ]);

  return (
    <GooglePageClient
      data={businessData}
      hasConfig={!!gbConfig}
      whatsappPhone={waConfig?.phoneNumberId ?? null}
      whatsappMsg={gbConfig?.whatsappMsg ?? null}
    />
  );
}
