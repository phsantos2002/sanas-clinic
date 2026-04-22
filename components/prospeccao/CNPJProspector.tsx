"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Building2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { importFromCNPJ, type CNPJCompany } from "@/app/actions/cnpjImport";
import { CNAE_OPTIONS, UF_OPTIONS } from "@/lib/cnae-list";

type Attendant = { id: string; name: string; role: string };
type Stage = { id: string; name: string; eventName: string };

type Props = {
  stages: Stage[];
  attendants: Attendant[];
};

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatPhone(digits: string) {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function CNPJProspector({ stages, attendants }: Props) {
  const router = useRouter();

  const [cnae, setCnae] = useState<string>(CNAE_OPTIONS[0]?.code ?? "");
  const [uf, setUf] = useState<string>("SP");
  const [city, setCity] = useState("");
  const [size, setSize] = useState("");
  const [requirePhone, setRequirePhone] = useState(true);
  const [requireEmail, setRequireEmail] = useState(false);
  const [maxResults, setMaxResults] = useState(20);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CNPJCompany[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastQuery, setLastQuery] = useState("");

  const [stageId, setStageId] = useState<string>(stages[0]?.id ?? "");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const cnaeGroups = useMemo(() => {
    const map = new Map<string, typeof CNAE_OPTIONS>();
    for (const opt of CNAE_OPTIONS) {
      const list = map.get(opt.group) ?? [];
      list.push(opt);
      map.set(opt.group, list);
    }
    return Array.from(map.entries());
  }, []);

  const selectedStage = stages.find((s) => s.id === stageId);
  const selectedCnae = CNAE_OPTIONS.find((c) => c.code === cnae);

  const handleSearch = async () => {
    if (!cnae) {
      toast.error("Selecione uma atividade (CNAE)");
      return;
    }
    if (!uf) {
      toast.error("Selecione a UF");
      return;
    }
    setSearching(true);
    setResults([]);
    setSelected(new Set());
    try {
      const r = await fetch("/api/cnpj/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnae,
          state: uf,
          city,
          size: size || undefined,
          requirePhone,
          requireEmail,
          maxResults,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (data.detail) {
          toast.error(data.error || "Erro ao buscar", {
            description: String(data.detail).slice(0, 400),
            duration: 15000,
          });
          console.error("[CNPJProspector] erro detalhado:", data);
        } else {
          toast.error(data.error || "Erro ao buscar");
        }
        setSearching(false);
        return;
      }
      setResults(data.results);
      setLastQuery([selectedCnae?.label, city, uf].filter(Boolean).join(" • "));
      setSelected(new Set(data.results.map((c: CNPJCompany) => c.cnpj)));

      if (data.results.length > 0) {
        toast.success(`${data.results.length} empresas encontradas`);
      } else if (data.rawTotal > 0) {
        const sample = Array.isArray(data.sampleCities) ? data.sampleCities.join(", ") : "";
        toast.warning(
          `Encontrei ${data.rawTotal} empresas, mas nenhuma passou nos filtros locais.`,
          {
            description: sample
              ? `Cidades encontradas nos resultados: ${sample}. Ajuste o nome da cidade ou deixe em branco.`
              : "Relaxe o filtro de telefone/email ou remova a cidade.",
            duration: 15000,
          }
        );
        console.warn(
          "[CNPJProspector] rawTotal=",
          data.rawTotal,
          "sampleCities=",
          data.sampleCities
        );
      } else {
        toast.warning("Nenhuma empresa encontrada nesse CNAE + UF.", {
          description: data.rawResponsePreview
            ? `Resposta bruta da API: ${String(data.rawResponsePreview).slice(0, 300)}`
            : "Tente outra UF ou outro CNAE. A Receita pode não ter registros ativos para essa combinação.",
          duration: 20000,
        });
        console.warn("[CNPJProspector] vazio:", {
          sentUrl: data.sentUrl,
          rawResponsePreview: data.rawResponsePreview,
        });
      }
    } catch {
      toast.error("Erro na requisição");
    }
    setSearching(false);
  };

  const toggleSelected = (cnpj: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cnpj)) next.delete(cnpj);
      else next.add(cnpj);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((c) => c.cnpj)));
  };

  const handleImport = async () => {
    if (!stageId) {
      toast.error("Selecione a coluna de destino");
      return;
    }
    const toImport = results.filter((c) => selected.has(c.cnpj));
    if (toImport.length === 0) {
      toast.error("Nenhuma empresa selecionada");
      return;
    }
    setImporting(true);
    const r = await importFromCNPJ({
      companies: toImport,
      stageId,
      assignedTo: assignedTo || null,
      searchQuery: lastQuery,
    });
    setImporting(false);

    if (!r.success) {
      toast.error(r.error);
      return;
    }

    toast.success(
      `${r.data!.created} leads importados${r.data!.skipped > 0 ? ` • ${r.data!.skipped} duplicados ignorados` : ""}`
    );
    router.refresh();

    // Remove importados do resultado
    const importedCnpjs = new Set(toImport.map((c) => c.cnpj));
    setResults((prev) => prev.filter((c) => !importedCnpjs.has(c.cnpj)));
    setSelected(new Set());
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Prospector CNPJ (Receita)</h2>
            <p className="text-xs text-slate-400">
              Busque empresas brasileiras por atividade (CNAE) + região. Dados públicos da Receita
              Federal, com telefone/email de contato.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-3">
            <label className="text-xs font-medium text-slate-700 mb-1 block">
              Atividade (CNAE) <span className="text-red-500">*</span>
            </label>
            <select
              value={cnae}
              onChange={(e) => setCnae(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {cnaeGroups.map(([group, opts]) => (
                <optgroup key={group} label={group}>
                  {opts.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">
              UF <span className="text-red-500">*</span>
            </label>
            <select
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {UF_OPTIONS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.code}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-700 mb-1 block">
              Cidade (opcional)
            </label>
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
            <label className="text-xs font-medium text-slate-700 mb-1 block">Porte</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Qualquer</option>
              <option value="ME">MEI/ME (micro)</option>
              <option value="EPP">EPP (pequeno)</option>
              <option value="DEMAIS">Médio/Grande</option>
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
              <option value={50}>50</option>
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
              checked={requireEmail}
              onChange={(e) => setRequireEmail(e.target.checked)}
              className="rounded"
            />
            Só com email
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSearch}
            disabled={searching || !cnae || !uf}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Buscar empresas
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
              {results.length} empresas · {selected.size} selecionadas
            </p>
            <button
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              {selected.size === results.length ? "Desmarcar todas" : "Selecionar todas"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((c) => {
              const isSelected = selected.has(c.cnpj);
              const title = c.tradeName || c.corporateName;
              const subtitle = c.tradeName ? c.corporateName : null;
              return (
                <label
                  key={c.cnpj}
                  className={`flex gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50/30"
                      : "border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(c.cnpj)}
                    className="mt-1 rounded"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-slate-900 truncate flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {title}
                        </h4>
                        {subtitle && (
                          <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {formatCnpj(c.cnpj)}
                        </p>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(c.address || c.corporateName)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-indigo-600"
                        onClick={(e) => e.stopPropagation()}
                        title="Ver no Google Maps"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    {c.address && (
                      <p className="text-xs text-slate-500 flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-3 text-xs text-slate-600 pt-0.5">
                      {c.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-green-600" /> {formatPhone(c.phone)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-500 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> sem telefone
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1 text-slate-500 truncate">
                          <Mail className="h-3 w-3 text-blue-500" />
                          <span className="truncate max-w-[180px]">{c.email}</span>
                        </span>
                      )}
                      {c.size && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {c.size}
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
          <p className="text-sm text-slate-500">
            Nenhuma empresa encontrada para &ldquo;{lastQuery}&rdquo;.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Tente relaxar os filtros ou mudar a cidade/UF.
          </p>
        </div>
      )}
    </div>
  );
}
