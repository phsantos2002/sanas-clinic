import { getLeadsWithMessages } from "@/app/actions/messages";
import { ChatPageClient } from "@/components/chat/ChatPageClient";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const params = await searchParams;
  const leads = await getLeadsWithMessages();

  const selectedLeadId = params.leadId ?? null;

  return <ChatPageClient leads={leads} initialSelectedId={selectedLeadId} />;
}
