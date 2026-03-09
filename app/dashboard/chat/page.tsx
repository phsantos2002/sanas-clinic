import { getLeadsWithMessages } from "@/app/actions/messages";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const params = await searchParams;
  const leads = await getLeadsWithMessages();

  const selectedLead = params.leadId
    ? leads.find((l) => l.id === params.leadId)
    : leads[0];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-4 -my-6">
      {/* Sidebar: lead list */}
      <div className="w-72 flex-shrink-0 border-r border-zinc-200 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-200">
          <h2 className="text-sm font-semibold">Conversas</h2>
        </div>
        {leads.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">Nenhuma conversa ainda</p>
            <p className="text-xs text-zinc-300 mt-1">
              As mensagens do WhatsApp aparecerão aqui
            </p>
          </div>
        )}
        {leads.map((lead) => {
          const last = lead.messages.at(-1);
          const isSelected = lead.id === selectedLead?.id;
          return (
            <a
              key={lead.id}
              href={`/dashboard/chat?leadId=${lead.id}`}
              className={`flex items-start gap-3 px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${
                isSelected ? "bg-zinc-100" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-zinc-600">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  {!lead.aiEnabled && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      IA off
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate">
                  {last ? last.content : lead.phone}
                </p>
                {lead.stage && (
                  <p className="text-[10px] text-zinc-300 mt-0.5">{lead.stage.name}</p>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedLead ? (
          <ChatPanel lead={selectedLead} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-zinc-400">Selecione uma conversa</p>
          </div>
        )}
      </div>
    </div>
  );
}
