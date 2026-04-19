"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, FileText, MessageSquare, Plus, LayoutDashboard, Zap, X } from "lucide-react";
import { globalSearch, type SearchResult } from "@/app/actions/search";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { label: "Criar lead", icon: Plus, url: "/dashboard/pipeline" },
  { label: "Ir para pipeline", icon: LayoutDashboard, url: "/dashboard/pipeline" },
  { label: "Abrir chat", icon: MessageSquare, url: "/dashboard/chat" },
  { label: "Nova automacao", icon: Zap, url: "/dashboard/workflows" },
];

const TYPE_ICONS: Record<string, typeof User> = {
  lead: User,
  post: FileText,
  template: MessageSquare,
  message: MessageSquare,
};

const TYPE_LABELS: Record<string, string> = {
  lead: "Leads",
  post: "Posts",
  template: "Templates",
  message: "Mensagens",
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const r = await globalSearch(q);
    setResults(r);
    setSelectedIndex(0);
    setLoading(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const navigate = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const allItems =
    query.length >= 2
      ? results
      : QUICK_ACTIONS.map((a, i) => ({
          id: `action-${i}`,
          type: "action" as const,
          title: a.label,
          subtitle: "",
          url: a.url,
        }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      navigate(allItems[selectedIndex].url);
    }
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ||= []).push(r);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar leads, posts, templates..."
            className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
            ESC
          </kbd>
          <button onClick={() => setOpen(false)} className="sm:hidden p-1 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-2">
              <p className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                Acoes rapidas
              </p>
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(action.url)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedIndex === i
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          ) : loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Nenhum resultado para &quot;{query}&quot;
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(grouped).map(([type, items]) => {
                const Icon = TYPE_ICONS[type] || FileText;
                return (
                  <div key={type}>
                    <p className="px-3 py-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      {TYPE_LABELS[type] || type}
                    </p>
                    {items.map((item) => {
                      const idx = allItems.findIndex((a) => a.id === item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.url)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                            selectedIndex === idx
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="flex-1 text-left min-w-0">
                            <p className="truncate font-medium">{item.title}</p>
                            <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
        </div>
      </div>
    </div>
  );
}
