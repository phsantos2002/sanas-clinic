"use client";

import { useState, useMemo } from "react";
import { Eye, Search, MessageCircle, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";
import { getStageColor, sourceConfig } from "@/components/icons/SourceIcons";

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
  source: string | null;
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
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  const stages = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.stage) set.add(l.stage.name); });
    return Array.from(set);
  }, [leads]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => { if (l.source) set.add(l.source); });
    return Array.from(set);
  }, [leads]);

  const activeFilterCount = (stageFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0);

  const filteredLeads = leads.filter((l) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !l.phone.includes(search)) return false;
    }
    if (stageFilter !== "all" && l.stage?.name !== stageFilter) return false;
    if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
    return true;
  });

  function clearFilters() {
    setStageFilter("all");
    setSourceFilter("all");
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -mx-4 -my-6">
      {/* Sidebar: lead list */}
      <div className="w-80 flex-shrink-0 border-r border-slate-100 bg-white overflow-y-auto">
        <div className="px-4 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-indigo-500" />
              Conversas
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs rounded-lg relative ${showFilters ? "text-indigo-600 bg-indigo-50" : "text-slate-400"}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs border-slate-200 rounded-xl bg-slate-50/50"
            />
          </div>
          {showFilters && (
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Estágio</label>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="w-full mt-1 h-7 text-xs border border-slate-200 rounded-lg bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="all">Todos os estágios</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Origem</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full mt-1 h-7 text-xs border border-slate-200 rounded-lg bg-white px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="all">Todas as origens</option>
                  {sources.map((s) => (
                    <option key={s} value={s}>{sourceConfig[s]?.label ?? s}</option>
                  ))}
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <X className="h-3 w-3" />
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
        {filteredLeads.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400">Nenhuma conversa encontrada</p>
            <p className="text-xs text-slate-300 mt-1">
              {activeFilterCount > 0 ? "Tente ajustar os filtros" : "As mensagens do WhatsApp aparecerão aqui"}
            </p>
          </div>
        )}
        {filteredLeads.map((lead) => {
          const last = lead.messages.at(-1);
          const isSelected = lead.id === selectedId;
          const stageColor = lead.stage ? getStageColor(lead.stage.name) : null;
          return (
            <div
              key={lead.id}
              className={`flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer ${
                isSelected ? "bg-indigo-50/50 border-l-2 border-l-indigo-500" : ""
              }`}
              onClick={() => setSelectedId(lead.id)}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isSelected ? "bg-indigo-100" : "bg-slate-100"
              }`}>
                <span className={`text-sm font-bold ${isSelected ? "text-indigo-600" : "text-slate-500"}`}>
                  {lead.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm font-semibold truncate ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                    {lead.name}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!lead.aiEnabled && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        IA off
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailLeadId(lead.id);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      title="Ver detalhes do lead"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {last ? last.content : lead.phone}
                </p>
                {lead.stage && stageColor && (
                  <span className={`inline-flex text-[10px] font-semibold mt-1 px-1.5 py-0.5 rounded-md ${stageColor.bg} ${stageColor.text}`}>
                    {lead.stage.name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
        {selectedLead ? (
          <ChatPanel
            lead={selectedLead}
            onViewDetails={() => setDetailLeadId(selectedLead.id)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-indigo-300" />
            </div>
            <p className="text-sm text-slate-400">Selecione uma conversa</p>
          </div>
        )}
      </div>

      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
      />
    </div>
  );
}
