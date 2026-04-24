"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Kanban,
  List,
  X,
  Download,
  SlidersHorizontal,
  CheckSquare,
  GitBranch,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";
import { BulkActionBar } from "@/components/dashboard/BulkActionBar";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { getAttendants } from "@/app/actions/whatsappHub";
import { getCadences } from "@/app/actions/cadences";
import type { FunnelData } from "@/app/actions/funnels";
import type { Lead, KanbanColumn, Stage } from "@/types";

type SavedFilter = {
  name: string;
  source: string | null;
  stage: string | null;
};

type Props = {
  leads: Lead[];
  columns: KanbanColumn[];
  stages: Stage[];
  funnels?: FunnelData[];
};

const SAVED_FILTERS_KEY = "sanas-saved-filters";
const SELECTED_FUNNEL_KEY = "sanas-selected-funnel";

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

function loadSelectedFunnel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SELECTED_FUNNEL_KEY);
}

export function DashboardClient({ leads, columns, stages, funnels = [] }: Props) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(loadSavedFilters);
  const [showSavedDropdown, setShowSavedDropdown] = useState(false);
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [attendants, setAttendants] = useState<{ id: string; name: string; role: string }[]>([]);
  const [cadences, setCadences] = useState<{ id: string; name: string }[]>([]);
  // Funnel filter — defaults to default funnel or first available
  const initialFunnelId =
    loadSelectedFunnel() ?? funnels.find((f) => f.isDefault)?.id ?? funnels[0]?.id ?? null;
  const [funnelId, setFunnelIdState] = useState<string | null>(initialFunnelId);

  const setFunnelId = useCallback((id: string | null) => {
    setFunnelIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem(SELECTED_FUNNEL_KEY, id);
      else localStorage.removeItem(SELECTED_FUNNEL_KEY);
    }
  }, []);

  // Load bulk-action data once
  useEffect(() => {
    getAttendants().then((list) =>
      setAttendants(list.map((a) => ({ id: a.id, name: a.name, role: a.role })))
    );
    getCadences().then((list) =>
      setCadences(list.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name })))
    );
  }, []);

  // Reset stage filter when switching funnels (selected stage may not exist in new funnel)
  useEffect(() => {
    if (stageFilter && !stages.some((s) => s.id === stageFilter && s.funnelId === funnelId)) {
      setStageFilter(null);
    }
  }, [funnelId, stageFilter, stages]);

  const toggleSelect = useCallback((leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

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

  const removeSavedFilter = useCallback(
    (index: number) => {
      const updated = savedFilters.filter((_, i) => i !== index);
      setSavedFilters(updated);
      persistSavedFilters(updated);
    },
    [savedFilters]
  );

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
          (l) => !l.source || !["meta", "whatsapp", "manual"].includes(l.source)
        );
      } else {
        result = result.filter((l) => l.source === sourceFilter);
      }
    }

    if (stageFilter) {
      result = result.filter((l) => l.stageId === stageFilter);
    }

    if (tagFilter) {
      result = result.filter((l) => l.tags?.includes(tagFilter!));
    }

    return result;
  }, [leads, search, sourceFilter, stageFilter, tagFilter]);

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

  // Restrict to the selected funnel's stages
  const visibleStages = useMemo(
    () => (funnelId ? stages.filter((s) => s.funnelId === funnelId) : stages),
    [stages, funnelId]
  );

  const filteredColumns = useMemo(() => {
    const visibleStageIds = new Set(visibleStages.map((s) => s.id));
    return columns
      .filter((col) => visibleStageIds.has(col.id))
      .map((col) => ({
        ...col,
        leads: col.leads.filter((l) => filteredLeads.some((fl) => fl.id === l.id)),
      }));
  }, [columns, filteredLeads, visibleStages]);

  // When clicking edit from table/kanban, open detail modal first (user can click edit there)
  const handleEditLead = useCallback((leadId: string) => {
    setSelectedLeadId(leadId);
  }, []);

  return (
    <div className="space-y-5">
      {/* Filter bar — single row on desktop with everything inline.
          Order: funnel, search, origin, stage, saved filters, select, export,
          novo lead, view toggle. Wraps to additional rows only on narrow
          screens; the browser picks the wrap points based on available width. */}
      <div className="bg-white border border-slate-100 rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3 shadow-sm flex items-center gap-2 flex-wrap">
        {funnels.length > 0 && (
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-slate-400" />
            <CustomSelect
              options={funnels.map((f) => ({ value: f.id, label: f.name }))}
              value={funnelId ?? funnels[0]?.id ?? ""}
              onChange={(v) => setFunnelId(v || null)}
              className="w-[160px]"
            />
          </div>
        )}

        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <Input
            placeholder="Buscar nome, telefone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white"
          />
        </div>

        <CustomSelect
          options={[
            { value: "", label: "Todas as Origens" },
            { value: "meta", label: "Meta Ads" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "manual", label: "Manual" },
            { value: "unknown", label: "Não Rastreada" },
          ]}
          value={sourceFilter ?? ""}
          onChange={(v) => setSourceFilter(v || null)}
          className="w-full sm:w-[150px]"
        />

        <CustomSelect
          options={[
            { value: "", label: "Todas as Etapas" },
            ...visibleStages.map((s) => ({ value: s.id, label: s.name })),
          ]}
          value={stageFilter ?? ""}
          onChange={(v) => setStageFilter(v || null)}
          className="w-full sm:w-[150px]"
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedDropdown(!showSavedDropdown)}
            className="h-9 text-sm gap-2 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Filtros Salvos</span>
          </Button>
          {showSavedDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSavedDropdown(false)} />
              <div className="absolute left-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[220px] py-1.5">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSavedFilter(i);
                        }}
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

        <Button
          variant={selectionMode || selectedIds.size > 0 ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSelectionMode((v) => !v);
            if (selectionMode) setSelectedIds(new Set());
          }}
          className={`h-9 text-sm gap-2 rounded-xl ${selectionMode || selectedIds.size > 0 ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
          title="Seleção em massa (ou use Ctrl/Cmd+click nos cards)"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectedIds.size > 0 && <span className="hidden lg:inline">{selectedIds.size}</span>}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="h-9 text-sm gap-2 rounded-xl"
          title="Exportar CSV"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>

        {/* Primary action + view toggle pushed right */}
        <div className="ml-auto flex items-center gap-2">
          <CreateLeadModal stages={stages} />
          <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button
              onClick={() => setView("kanban")}
              className={`p-2 rounded-lg transition-all ${
                view === "kanban"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Kanban className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 rounded-lg transition-all ${
                view === "table"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
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
        <KanbanBoard
          columns={filteredColumns}
          onClickLead={setSelectedLeadId}
          onEditLead={handleEditLead}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          selectionMode={selectionMode}
          attendants={attendants}
          stages={visibleStages}
        />
      ) : (
        <LeadsTable
          leads={filteredLeads}
          onClickLead={setSelectedLeadId}
          onEditLead={handleEditLead}
        />
      )}

      <LeadDetailModal
        leadId={selectedLeadId}
        stages={visibleStages}
        onClose={() => setSelectedLeadId(null)}
      />

      {/* Floating bulk action bar */}
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        stages={visibleStages}
        attendants={attendants}
        cadences={cadences}
        onClear={clearSelection}
      />
    </div>
  );
}
