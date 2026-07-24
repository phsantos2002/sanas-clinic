import { listFlows } from "@/app/actions/chatbot";
import { ChatbotFlowsSection } from "@/components/settings/ChatbotFlowsSection";

export const dynamic = "force-dynamic";

export default async function FlowsSettingsPage() {
  const flows = await listFlows();

  return (
    <div className="space-y-4">
      <ChatbotFlowsSection flows={flows} />
    </div>
  );
}
