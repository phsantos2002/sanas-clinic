"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Star,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { importFromGoogleMaps } from "@/app/actions/googleMapsImport";
import type { GoogleMapsPlace } from "@/app/actions/googleMapsImport";

type Attendant = { id: string; name: string; role: string };
type Stage = { id: string; name: string; eventName: string };

type Props = {
  stages: Stage[];
  attendants: Attendant[];
};

export function GoogleMapsProspector({ stages, attendants }: Props) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState<number>(0);
  const [requirePhone, setRequirePhone] = useState(true);
  const [requireWebsite, setRequireWebsite] = useState(false);
  const [excludeRated, setExcludeRated] = useState(false);
  const [maxResults, setMaxResults] = useState(20);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GoogleMapsPlace[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastQuery, setLastQuery] = useState("");

  const [stageId, setStageId] = useState<string>(stages[0]?.id ?? "");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const selectedStage = stages.find((s) => s.id === stageId);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Informe o que buscar (ex: dentistas)");
      return;
    }
    setSearching(true);
    setResults([]);
    setSelected(new Set());
    try {
      const r = await fetch("/api/google-maps/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          city,
          minRating: minRating > 0 ? minRating : undefined,
          requirePhone,
          requireWebsite,
          excludeRated,
          maxResults,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error || "Erro ao buscar");
        setSearching(false);
        return;
      }
      setResults(data.results);
      setLastQuery([query, city].filter(Boolean).join(" em "));
      setSelected(new Set(data.results.map((p: GoogleMapsPlace) => p.placeId)));
      toast.success(`${data.results.length} resultados`);
    } catch {
      toast.error("Erro na requisição");
    }
    setSearching(false);
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((p) => p.placeId)));
  };

  const handleImport = async () => {
    if (!stageId) {
      toast.error("Selecione a coluna de destino");
      return;
    }
    const toImport = results.filter((p) => selected.has(p.placeId));
    if (toImport.length === 0) {
      toast.error("Nenhum estabelecimento selecionado");
      return;
    }
    setImporting(true);
    const r = await importFromGoogleMaps({
      places: toImport,
      stageId,
      assignedTo: assignedTo || null,
      searchQuery: lastQuery,
    });
    setImporting(false);

    if (!r.success) {
      toast.error(r.error);
      return;
    }

    toast.success(`${r.data!.created} leads importados • Pixel disparado`);
    router.refresh();

    const keepIds = new Set(
      toImport
        .filter((_, i) => !r.data!.errors.some((e) => e.name === toImport[i].name))
        .map((p) => p.placeId)
    );
    setResults((prev) => prev.filter((p) => !keepIds.has(p.placeId)));
    setSelected(new Set());
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Prospector Google Maps</h2>
            <p className="text-xs text-slate-400">
              Busque empresas no Google Maps, filtre e envie para uma coluna do pipeline com evento
              Pixel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-700 mb-1 block">
              O que buscar <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: dentistas, advogados, clínicas estéticas"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Cidade / região</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ex: São Paulo"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Rating mínimo</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value={0}>Qualquer</option>
              <option value={3}>≥ 3.0</option>
              <option value={4}>≥ 4.0</option>
              <option value={4.5}>≥ 4.5</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Máx. resultados</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700 pt-5">
            <input
              type="checkbox"
              checked={requirePhone}
              onChange={(e) => setRequirePhone(e.target.checked)}
              className="rounded"
            />
            Só com telefone
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 pt-5">
            <input
              type="checkbox"
              checked={requireWebsite}
              onChange={(e) => setRequireWebsite(e.target.checked)}
              className="rounded"
            />
            Só com site
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={excludeRated}
              onChange={(e) => setExcludeRated(e.target.checked)}
              className="rounded"
            />
            Excluir concorrentes já consolidados (5+ avaliações)
          </label>
          <div className="flex-1" />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Buscar no Google Maps
              </>
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-slate-700 mb-1 block">
                Coluna de destino <span className="text-red-500">*</span>
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {selectedStage && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Dispara Pixel: <strong>{selectedStage.eventName}</strong>
                </p>
              )}
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-slate-700 mb-1 block">
                Atribuir a (opcional)
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Não atribuir —</option>
                {attendants
                  .filter(
                    (a) => a.role === "sdr" || a.role === "attendant" || a.role === "sdr_manager"
                  )
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0 || !stageId}
              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? "Importando..." : `Enviar ${selected.size} p/ pipeline`}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {results.length} resultados · {selected.size} selecionados
            </p>
            <button
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {selected.size === results.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((p) => {
              const isSelected = selected.has(p.placeId);
              return (
                <label
                  key={p.placeId}
                  className={`flex gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50/30"
                      : "border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(p.placeId)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-slate-900 truncate">{p.name}</h4>
                      {p.mapsUrl && (
                        <a
                          href={p.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {p.address && (
                      <p className="text-xs text-slate-500 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate">{p.address}</span>
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-3 text-xs text-slate-600 pt-0.5">
                      {p.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-green-600" /> {p.phone}
                        </span>
                      )}
                      {p.website && (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Globe className="h-3 w-3" /> site
                        </span>
                      )}
                      {p.rating != null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {p.rating}
                          {p.reviews ? <span className="text-slate-400">({p.reviews})</span> : null}
                        </span>
                      )}
                      {!p.phone && (
                        <span className="text-[10px] text-red-500 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> sem telefone
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!searching && results.length === 0 && lastQuery && (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum resultado para &ldquo;{lastQuery}&rdquo;.</p>
          <p className="text-xs text-slate-400 mt-1">
            Tente outros termos, relaxe os filtros ou mude a cidade.
          </p>
        </div>
      )}
    </div>
  );
}
