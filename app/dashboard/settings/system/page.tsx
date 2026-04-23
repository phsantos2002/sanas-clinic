import { listWebhookDLQ, listAuditLog } from "@/app/actions/system";
import { SystemPanel } from "@/components/settings/SystemPanel";

export default async function SystemSettingsPage() {
  const [dlq, audit] = await Promise.all([
    listWebhookDLQ({ showResolved: false, limit: 50 }),
    listAuditLog({ limit: 100 }),
  ]);

  return <SystemPanel dlq={dlq} audit={audit} />;
}
