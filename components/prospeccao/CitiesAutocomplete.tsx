"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

type City = { code: string; name: string };

type Props = {
  uf: string;
  value: City | null;
  onChange: (city: City | null) => void;
  placeholder?: string;
};

export function CitiesAutocomplete({ uf, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [options, setOptions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Sincroniza o texto do input quando o valor externo muda (ex: UF trocou).
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value]);

  // Limpa seleção quando UF muda.
  useEffect(() => {
    if (value && value.code.length > 0) {
      // Se o código atual não pertence a essa UF, zera.
      // IBGE codes: 2 primeiros dígitos = código da UF. Não temos a tabela aqui,
      // então simplesmente limpamos o input ao trocar de UF.
    }
    setQuery("");
    onChange(null);
    setOptions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uf]);

  const fetchOptions = useCallback(
    async (q: string) => {
      if (!uf) return;
      setLoading(true);
      try {
        const r = await fetch(`/api/ibge/municipalities?uf=${uf}&q=${encodeURIComponent(q)}`);
        const data = await r.json();
        if (r.ok && Array.isArray(data.results)) {
          setOptions(data.results);
        }
      } catch {
        // silencioso
      }
      setLoading(false);
    },
    [uf]
  );

  // Debounce 250ms
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const handle = setTimeout(() => fetchOptions(q), 250);
    return () => clearTimeout(handle);
  }, [query, open, fetchOptions]);

  // Fecha ao clicar fora.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => options.slice(0, 20), [options]);

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange(null);
          }}
          placeholder={placeholder ?? "Cidade..."}
          className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange(null);
              setOptions([]);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (filtered.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-100 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-slate-400">Buscando...</div>}
          {filtered.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c);
                setQuery(c.name);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 text-slate-700"
            >
              {c.name}
              <span className="text-[10px] text-slate-400 ml-2">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
