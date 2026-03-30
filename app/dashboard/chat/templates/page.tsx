import { getMessageTemplates } from "@/app/actions/whatsappHub";
import { TemplatesClient } from "@/components/chat/TemplatesClient";

export default async function TemplatesPage() {
  const templates = await getMessageTemplates();
  return <TemplatesClient templates={templates} />;
}
