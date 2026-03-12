"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";

type Message = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  aiEnabled: boolean;
  stage: { name: string } | null;
  messages: Message[];
};

type Props = {
  leads: Lead[];
  initialSelectedId: string | null;
};

export function ChatPageClient({ leads, initialSelectedId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-4 -my-6">
      {/* Sidebar: lead list */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold">Conversas</h2>
        </div>
        {leads.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400">Nenhuma conversa ainda</p>
            <p className="text-xs text-slate-300 mt-1">
              As mensagens do WhatsApp aparecerão aqui
            </p>
          </div>
        )}
        {leads.map((lead) => {
          const last = lead.messages.at(-1);
          const isSelected = lead.id === selectedId;
          return (
            <div
              key={lead.id}
              className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                isSelected ? "bg-slate-100" : ""
              }`}
              onClick={() => setSelectedId(lead.id)}
            >
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-slate-600">
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!lead.aiEnabled && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        IA off
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailLeadId(lead.id);
                      }}
                      className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Ver detalhes do lead"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {last ? last.content : lead.phone}
                </p>
                {lead.stage && (
                  <p className="text-[10px] text-slate-300 mt-0.5">{lead.stage.name}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedLead ? (
          <ChatPanel
            lead={selectedLead}
            onViewDetails={() => setDetailLeadId(selectedLead.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-400">Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
      />
    </div>
  );
}
