"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Kanban, List, X, Download, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";
import { SourceCards } from "@/components/dashboard/SourceCards";
import type { Lead, KanbanColumn, LeadSourceStats, Stage, Tag } from "@/types";

type SavedFilter = {
  name: string;
  source: string | null;
  stage: string | null;
  tag: string | null;
};

type Props = {
  leads: Lead[];
  columns: KanbanColumn[];
  stats: LeadSourceStats;
  stages: Stage[];
  tags: Tag[];
};

const SAVED_FILTERS_KEY = "lux-saved-filters";

function loadSavedFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_FILTERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function persistSavedFilters(filters: SavedFilter[]) {
  localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters));
}

export function DashboardClient({ leads, columns, stats, stages, tags }: Props) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);

  const hasActiveFilters = !!(search.trim() || sourceFilter || stageFilter || tagFilter);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSourceFilter(null);
    setStageFilter(null);
    setTagFilter(null);
  }, []);

  const saveCurrentFilter = useCallback(() => {
    const name = prompt("Nome do filtro:");
    if (!name?.trim()) return;
    const newFilter: SavedFilter = {
      name: name.trim(),
      source: sourceFilter,
      stage: stageFilter,
      tag: tagFilter,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    persistSavedFilters(updated);
  }, [sourceFilter, stageFilter, tagFilter, savedFilters]);

  const applySavedFilter = useCallback((filter: SavedFilter) => {
    setSourceFilter(filter.source);
    setStageFilter(filter.stage);
    setTagFilter(filter.tag);
    setShowSavedDropdown(false);
  }, []);

  const removeSavedFilter = useCallback((index: number) => {
    const updated = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(updated);
    persistSavedFilters(updated);
  }, [savedFilters]);

  const exportCSV = useCallback(() => {
    const headers = ["Nome", "Telefone", "Origem", "Etapa", "Campanha", "Criado em"];
    const rows = filteredLeads.map((l) => [
      l.name,
      l.phone,
      l.source ?? "Não rastreada",
      l.stage?.name ?? "—",
      l.campaign ?? "—",
      new Date(l.createdAt).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, search, sourceFilter, stageFilter, tagFilter]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q)
      );
    }

    if (sourceFilter) {
      if (sourceFilter === "unknown") {
        result = result.filter(
          (l) => !l.source || !["meta", "google", "whatsapp", "manual"].includes(l.source)
        );
      } else {
        result = result.filter((l) => l.source === sourceFilter);
      }
    }

    if (stageFilter) {
      result = result.filter((l) => l.stageId === stageFilter);
    }

    if (tagFilter) {
      result = result.filter((l) => l.tags.some((t) => t.tagId === tagFilter));
    }

    return result;
  }, [leads, search, sourceFilter, stageFilter, tagFilter]);

  const filteredColumns = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      leads: col.leads.filter((l) => filteredLeads.some((fl) => fl.id === l.id)),
    }));
  }, [columns, filteredLeads]);

  return (
    <div className="space-y-4">
      {/* Source counter cards */}
      <SourceCards stats={stats} activeFilter={sourceFilter} onFilter={setSourceFilter} />

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar Nome ou parte do telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-200"
          />
        </div>

        {/* Origin dropdown */}
        <select
          value={sourceFilter ?? ""}
          onChange={(e) => setSourceFilter(e.target.value || null)}
          className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-zinc-300"
        >
          <option value="">Todas as Origens</option>
          <option value="meta">Meta Ads</option>
          <option value="google">Google Ads</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="manual">Manual</option>
          <option value="unknown">Não Rastreada</option>
        </select>

        {/* Stage dropdown */}
        <select
          value={stageFilter ?? ""}
          onChange={(e) => setStageFilter(e.target.value || null)}
          className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-zinc-300"
        >
          <option value="">Todas as Etapas</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Tag dropdown */}
        {tags.length > 0 && (
          <select
            value={tagFilter ?? ""}
            onChange={(e) => setTagFilter(e.target.value || null)}
            className="h-8 text-xs border border-slate-200 rounded-md px-2 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-zinc-300"
          >
            <option value="">Todas as Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors whitespace-nowrap"
          >
            <X className="h-3 w-3" />
            Limpar Filtros
          </button>
        )}

        {/* Separator */}
        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Saved filters */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedDropdown(!showSavedDropdown)}
            className="h-8 text-xs gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filtros Salvos
          </Button>

          {showSavedDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSavedDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[200px] py-1">
                {savedFilters.length === 0 ? (
                  <p className="text-xs text-slate-400 px-3 py-2">Nenhum filtro salvo</p>
                ) : (
                  savedFilters.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50/80 cursor-pointer"
                    >
                      <button
                        onClick={() => applySavedFilter(f)}
                        className="text-xs text-slate-700 flex-1 text-left"
                      >
                        {f.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSavedFilter(i); }}
                        className="text-slate-400 hover:text-red-500 ml-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
                <div className="border-t border-zinc-100 mt-1 pt-1">
                  <button
                    onClick={saveCurrentFilter}
                    disabled={!hasActiveFilters}
                    className="w-full text-left text-xs px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent"
                  >
                    + Salvar filtro atual
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Export CSV */}
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="h-8 text-xs gap-1.5"
          title="Exportar CSV"
        >
          <Download className="h-3 w-3" />
        </Button>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 border border-slate-200 rounded-md p-0.5 ml-auto">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded ${
              view === "kanban" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded ${
              view === "table" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-xs text-slate-500">
          {filteredLeads.length} de {leads.length} leads
        </p>
      )}

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard columns={filteredColumns} />
      ) : (
        <>
          <LeadsTable leads={filteredLeads} onClickLead={setSelectedLeadId} />
          <LeadDetailModal
            leadId={selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
          />
        </>
      )}
    </div>
  );
}
