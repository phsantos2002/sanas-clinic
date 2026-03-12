"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Kanban, List, X, Download, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";
import { SourceCards } from "@/components/dashboard/SourceCards";
import type { Lead, KanbanColumn, LeadSourceStats, Stage } from "@/types";

type SavedFilter = {
  name: string;
  source: string | null;
  stage: string | null;
};

type Props = {
  leads: Lead[];
  columns: KanbanColumn[];
  stats: LeadSourceStats;
  stages: Stage[];
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

export function DashboardClient({ leads, columns, stats, stages }: Props) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);

  const hasActiveFilters = !!(search.trim() || sourceFilter || stageFilter);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSourceFilter(null);
    setStageFilter(null);
  }, []);

  const saveCurrentFilter = useCallback(() => {
    const name = prompt("Nome do filtro:");
    if (!name?.trim()) return;
    const newFilter: SavedFilter = {
      name: name.trim(),
      source: sourceFilter,
      stage: stageFilter,
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    persistSavedFilters(updated);
  }, [sourceFilter, stageFilter, savedFilters]);

  const applySavedFilter = useCallback((filter: SavedFilter) => {
    setSourceFilter(filter.source);
    setStageFilter(filter.stage);
    setShowSavedDropdown(false);
  }, []);

  const removeSavedFilter = useCallback((index: number) => {
    const updated = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(updated);
    persistSavedFilters(updated);
  }, [savedFilters]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.email && l.email.toLowerCase().includes(q))
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

    return result;
  }, [leads, search, sourceFilter, stageFilter]);

  const exportCSV = useCallback(() => {
    const headers = ["Nome", "Telefone", "Email", "Origem", "Etapa", "Campanha", "Criado em"];
    const rows = filteredLeads.map((l) => [
      l.name,
      l.phone,
      l.email ?? "",
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
  }, [filteredLeads]);

  const filteredColumns = useMemo(() => {
    return columns.map((col) => ({
      ...col,
      leads: col.leads.filter((l) => filteredLeads.some((fl) => fl.id === l.id)),
    }));
  }, [columns, filteredLeads]);

  // When clicking edit from table/kanban, open detail modal first (user can click edit there)
  const handleEditLead = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
  }, []);

  return (
    <div className="space-y-5">
      {/* Source counter cards */}
      <SourceCards stats={stats} activeFilter={sourceFilter} onFilter={setSourceFilter} />

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <Input
            placeholder="Buscar nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
          />
        </div>

        {/* Origin dropdown */}
        <CustomSelect
          options={[
            { value: "", label: "Todas as Origens" },
            { value: "meta", label: "Meta Ads" },
            { value: "google", label: "Google Ads" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "manual", label: "Manual" },
            { value: "unknown", label: "Não Rastreada" },
          ]}
          value={sourceFilter ?? ""}
          onChange={(v) => setSourceFilter(v || null)}
          className="w-[180px]"
        />

        {/* Stage dropdown */}
        <CustomSelect
          options={[
            { value: "", label: "Todas as Etapas" },
            ...stages.map((s) => ({ value: s.id, label: s.name })),
          ]}
          value={stageFilter ?? ""}
          onChange={(v) => setStageFilter(v || null)}
          className="w-[180px]"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" />
            Limpar Filtros
          </button>
        )}

        {/* Separator */}
        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Saved filters */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedDropdown(!showSavedDropdown)}
            className="h-9 text-sm gap-2 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros Salvos
          </Button>

          {showSavedDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSavedDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[220px] py-1.5">
                {savedFilters.length === 0 ? (
                  <p className="text-sm text-slate-400 px-4 py-3">Nenhum filtro salvo</p>
                ) : (
                  savedFilters.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <button
                        onClick={() => applySavedFilter(f)}
                        className="text-sm text-slate-700 flex-1 text-left font-medium"
                      >
                        {f.name}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeSavedFilter(i); }}
                        className="text-slate-300 hover:text-red-500 ml-2 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={saveCurrentFilter}
                    disabled={!hasActiveFilters}
                    className="w-full text-left text-sm px-4 py-2 text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent font-medium"
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
          className="h-9 text-sm gap-2 rounded-xl"
          title="Exportar CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>

        {/* View toggle */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 ml-auto bg-slate-50">
          <button
            onClick={() => setView("kanban")}
            className={`p-2 rounded-lg transition-all ${
              view === "kanban" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Kanban className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-2 rounded-lg transition-all ${
              view === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-slate-500 font-medium">
          {filteredLeads.length} de {leads.length} leads
        </p>
      )}

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard columns={filteredColumns} onClickLead={setSelectedLeadId} onEditLead={handleEditLead} />
      ) : (
        <LeadsTable leads={filteredLeads} onClickLead={setSelectedLeadId} onEditLead={handleEditLead} />
      )}

      <LeadDetailModal
        leadId={selectedLeadId}
        stages={stages}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
}
