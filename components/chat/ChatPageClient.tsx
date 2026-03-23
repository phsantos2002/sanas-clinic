"use client";

import { useState, useMemo } from "react";
import { Eye, Search, MessageCircle, Filter, X, ArrowLeft, Bot, BotOff, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";
import { getStageColor, sourceConfig, stageColors, SourceIcon } from "@/components/icons/SourceIcons";

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
  updatedAt: Date;
  stage: { name: string } | null;
  messages: Message[];
};

type Props = {
  leads: Lead[];
  initialSelectedId: string | null;
};

const ALL_SOURCES = ["meta", "whatsapp", "manual", "unknown"] as const;
const ALL_STAGES = ["Novo Lead", "Atendido", "Qualificado", "Agendado", "Cliente"] as const;

function formatMessageTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type AiFilter = "all" | "on" | "off";

export function ChatPageClient({ leads, initialSelectedId }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [aiFilter, setAiFilter] = useState<AiFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const name = l.stage?.name ?? "Sem estágio";
      counts[name] = (counts[name] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const src = l.source ?? "unknown";
      counts[src] = (counts[src] ?? 0) + 1;
    });
    return counts;
  }, [leads]);

  const activeFilterCount =
    (stageFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (aiFilter !== "all" ? 1 : 0);

  const filteredLeads = leads
    .filter((l) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.phone.includes(search)) return false;
      }
      if (stageFilter !== "all" && l.stage?.name !== stageFilter) return false;
      if (sourceFilter !== "all") {
        if (sourceFilter === "unknown") {
          if (l.source && l.source !== "unknown") return false;
        } else if (l.source !== sourceFilter) return false;
      }
      if (aiFilter === "on" && !l.aiEnabled) return false;
      if (aiFilter === "off" && l.aiEnabled) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.messages.at(-1)?.createdAt ?? a.updatedAt;
      const bTime = b.messages.at(-1)?.createdAt ?? b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  function clearFilters() {
    setStageFilter("all");
    setSourceFilter("all");
    setAiFilter("all");
  }

  function handleSelectLead(id: string) {
    setSelectedId(id);
  }

  function handleBackToList() {
    setSelectedId(null);
  }

  const showMobileSidebar = !selectedId;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] -mx-4 -my-4 md:-mx-6 md:-my-8">
      {/* Sidebar */}
      <div className={`${showMobileSidebar ? "flex" : "hidden"} md:flex w-full md:w-80 flex-shrink-0 border-r border-slate-100 bg-white overflow-y-auto flex-col`}>
        <div className="px-4 py-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-indigo-500" />
              Conversas
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {leads.length}
              </span>
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
              placeholder="Buscar nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs border-slate-200 rounded-xl bg-slate-50/50"
            />
          </div>

          {showFilters && (
            <div className="space-y-3 pt-1">
              {/* Stage filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Estágio</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <button
                    onClick={() => setStageFilter("all")}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                      stageFilter === "all"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Todos
                  </button>
                  {ALL_STAGES.map((stage) => {
                    const color = stageColors[stage] ?? { bg: "bg-slate-100", text: "text-slate-700" };
                    const count = stageCounts[stage] ?? 0;
                    const isActive = stageFilter === stage;
                    return (
                      <button
                        key={stage}
                        onClick={() => setStageFilter(isActive ? "all" : stage)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          isActive
                            ? `${color.bg} ${color.text} shadow-sm`
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {stage}
                        {count > 0 && (
                          <span className={`text-[9px] px-1 rounded-full ${
                            isActive ? "bg-white/60" : "bg-slate-200/70"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source filter */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Origem</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <button
                    onClick={() => setSourceFilter("all")}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all ${
                      sourceFilter === "all"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    Todas
                  </button>
                  {ALL_SOURCES.map((src) => {
                    const config = sourceConfig[src];
                    const count = sourceCounts[src] ?? 0;
                    const isActive = sourceFilter === src;
                    return (
                      <button
                        key={src}
                        onClick={() => setSourceFilter(isActive ? "all" : src)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                          isActive
                            ? `${config.bg} ${config.text} shadow-sm`
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <SourceIcon source={src} size={12} />
                        {config.label}
                        {count > 0 && (
                          <span className={`text-[9px] px-1 rounded-full ${
                            isActive ? "bg-white/60" : "bg-slate-200/70"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI */}
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">IA</label>
                <div className="flex gap-1 mt-1.5">
                  {([
                    { value: "all" as AiFilter, label: "Todas", icon: null },
                    { value: "on" as AiFilter, label: "Ativa", icon: Bot },
                    { value: "off" as AiFilter, label: "Off", icon: BotOff },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAiFilter(opt.value === aiFilter ? "all" : opt.value)}
                      className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                        aiFilter === opt.value
                          ? opt.value === "on" ? "bg-emerald-50 text-emerald-700 shadow-sm" :
                            opt.value === "off" ? "bg-amber-50 text-amber-700 shadow-sm" :
                            "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {opt.icon && <opt.icon className="h-3 w-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear + count */}
              <div className="flex items-center justify-between pt-0.5">
                {activeFilterCount > 0 ? (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </button>
                ) : (
                  <span />
                )}
                <span className="text-[10px] text-slate-400">
                  {filteredLeads.length} de {leads.length}
                </span>
              </div>
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
          const timeRef = last?.createdAt ?? lead.updatedAt;
          const isSelected = lead.id === selectedId;
          const stageColor = lead.stage ? getStageColor(lead.stage.name) : null;
          return (
            <div
              key={lead.id}
              className={`flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer ${
                isSelected ? "bg-indigo-50/50 border-l-2 border-l-indigo-500" : ""
              }`}
              onClick={() => handleSelectLead(lead.id)}
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
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatMessageTime(timeRef)}
                    </span>
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
                  {last
                    ? `${last.role === "assistant" ? "Você: " : ""}${last.content}`
                    : lead.phone}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {lead.stage && stageColor && (
                    <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${stageColor.bg} ${stageColor.text}`}>
                      {lead.stage.name}
                    </span>
                  )}
                  {lead.source && sourceConfig[lead.source] && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${sourceConfig[lead.source].bg} ${sourceConfig[lead.source].text}`}>
                      <SourceIcon source={lead.source} size={9} />
                      {sourceConfig[lead.source].label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat area */}
      <div className={`${showMobileSidebar ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-hidden bg-slate-50/30`}>
        {selectedLead ? (
          <>
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <span className="text-sm font-semibold text-slate-900 truncate">{selectedLead.name}</span>
            </div>
            <ChatPanel
              lead={selectedLead}
              onViewDetails={() => setDetailLeadId(selectedLead.id)}
            />
          </>
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
