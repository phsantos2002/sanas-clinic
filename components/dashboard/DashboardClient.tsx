"use client";

import { useState, useMemo } from "react";
import { Search, Kanban, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetailModal } from "@/components/modals/LeadDetailModal";
import { SourceCards } from "@/components/dashboard/SourceCards";
import type { Lead, KanbanColumn, LeadSourceStats } from "@/types";

type Props = {
  leads: Lead[];
  columns: KanbanColumn[];
  stats: LeadSourceStats;
};

export function DashboardClient({ leads, columns, stats }: Props) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

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

    return result;
  }, [leads, search, sourceFilter]);

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

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {sourceFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSourceFilter(null)}
            className="text-xs text-zinc-500"
          >
            Limpar Filtros
          </Button>
        )}

        <div className="flex items-center gap-1 ml-auto border border-zinc-200 rounded-md p-0.5">
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded ${
              view === "kanban" ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Kanban className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded ${
              view === "table" ? "bg-black text-white" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

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
