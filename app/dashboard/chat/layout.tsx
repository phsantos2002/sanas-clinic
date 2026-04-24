import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";
import { ChatTabsNav } from "@/components/chat/ChatTabsNav";

async function getVisibleChatTabs(): Promise<string[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const config = await prisma.aIConfig.findUnique({
    where: { userId: user.id },
    select: { automations: true },
  });
  const automations = (config?.automations as Record<string, boolean> | null) ?? {};
  const visible: string[] = [];
  if (automations.chatTab_assistant) visible.push("assistant");
  if (automations.chatTab_templates) visible.push("templates");
  if (automations.chatTab_broadcast) visible.push("broadcast");
  if (automations.chatTab_team) visible.push("team");
  return visible;
}

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const visibleTabs = await getVisibleChatTabs();

  return (
    // Cancel both the top AND bottom padding of the dashboard layout
    // so the chat occupies the full viewport below the top nav — no
    // gray strip above or below the conversation panel.
    <div className="flex flex-col gap-3 -mt-4 md:-mt-8 -mb-4 md:-mb-8">
      <ChatTabsNav visibleTabs={visibleTabs} />
      {children}
    </div>
  );
}
