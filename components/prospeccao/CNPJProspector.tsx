"use client";

import { useEffect, useMemo, useState } from "react";
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
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  Plus,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { importFromCNPJ, type CNPJCompany } from "@/app/actions/cnpjImport";
import { enrollLeadsInCadence } from "@/app/actions/cadences";
import { CNAE_OPTIONS, UF_OPTIONS } from "@/lib/cnae-list";
import { CitiesAutocomplete } from "./CitiesAutocomplete";

type Attendant = { id: string; name: string; role: string };
type Stage = { id: string; name: string; eventName: string };
type Cadence = { id: string; name: string; isActive: boolean };

type Props = {
  stages: Stage[];
  attendants: Attendant[];
  cadences: Cadence[];
};

type City = { code: string; name: string };

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

function formatCapital(v: number | null) {
  if (v == null) return null;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1).replace(".", ",")} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function scoreColor(score: number) {
  if (score >= 75) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  if (score >= 25) return "text-orange-700 bg-orange-50 border-orange-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
}

export function CNPJProspector({ stages, attendants, cadences }: Props) {
  const router = useRouter();

  // ── Filtros principais ──
  const [cnaes, setCnaes] = useState<string[]>([CNAE_OPTIONS[0]?.code ?? ""]);
  const [uf, setUf] = useState<string>("SP");
  const [cityIbge, setCityIbge] = useState<City | null>(null);
  const [district, setDistrict] = useState("");
  const [zipPrefix, setZipPrefix] = useState("");
  const [size, setSize] = useState("");
  const [ddd, setDdd] = useState("");
  const [requirePhone, setRequirePhone] = useState(true);
  const [requireEmail, setRequireEmail] = useState(false);
  const [maxResults, setMaxResults] = useState(20);

  // ── Filtros avançados ──
  const [advOpen, setAdvOpen] = useState(false);
  const [foundedFrom, setFoundedFrom] = useState("");
  const [foundedTo, setFoundedTo] = useState("");
  const [equityMin, setEquityMin] = useState<string>("");
  const [equityMax, setEquityMax] = useState<string>("");
  const [simples, setSimples] = useState<"yes" | "no" | "any">("any");
  const [mei, setMei] = useState<"yes" | "no" | "any">("any");
  const [onlyHead, setOnlyHead] = useState(false);

  // ── Estado de busca ──
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<CNPJCompany[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedQsa, setExpandedQsa] = useState<Set<string>>(new Set());
  const [lastQuery, setLastQuery] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);

  // ── Destino e enrollment ──
  const [stageId, setStageId] = useState<string>(stages[0]?.id ?? "");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [cadenceId, setCadenceId] = useState<string>("");
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
  const selectedCnaesLabels = cnaes
    .map((code) => CNAE_OPTIONS.find((c) => c.code === code)?.label)
    .filter(Boolean)
    .join(" + ");

  // Zera a cidade sempre que UF muda (o autocomplete já faz isso, redundante safe).
  useEffect(() => {
    setCityIbge(null);
  }, [uf]);

  const buildPayload = (token?: string) => ({
    cnaes,
    state: uf,
    cityIbgeCode: cityIbge?.code,
    district: district.trim() || undefined,
    zipPrefix: zipPrefix.replace(/\D/g, "").slice(0, 8) || undefined,
    size: size || undefined,
    ddd: ddd.replace(/\D/g, "").slice(0, 2) || undefined,
    foundedFrom: foundedFrom || undefined,
    foundedTo: foundedTo || undefined,
    equityMin: equityMin ? Number(equityMin.replace(/\D/g, "")) : undefined,
    equityMax: equityMax ? Number(equityMax.replace(/\D/g, "")) : undefined,
    simples: simples === "any" ? undefined : simples,
    mei: mei === "any" ? undefined : mei,
    onlyHead: onlyHead || undefined,
    requirePhone,
    requireEmail,
    maxResults,
    token,
  });

  const handleSearch = async () => {
    if (cnaes.filter(Boolean).length === 0) {
      toast.error("Selecione ao menos uma atividade (CNAE)");
      return;
    }
    if (!uf) {
      toast.error("Selecione a UF");
      return;
    }
    setSearching(true);
    setResults([]);
    setSelected(new Set());
    setNextToken(null);
    try {
      const r = await fetch("/api/cnpj/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await r.json();
      if (!r.ok) {
        const desc = data.detail ? String(data.detail).slice(0, 400) : undefined;
        toast.error(
          data.error || "Erro ao buscar",
          desc ? { description: desc, duration: 15000 } : undefined
        );
        console.error("[CNPJProspector] erro:", data);
        setSearching(false);
        return;
      }
      setResults(data.results);
      setSelected(new Set(data.results.map((c: CNPJCompany) => c.cnpj)));
      setNextToken(data.nextToken ?? null);
      setLastQuery([selectedCnaesLabels, cityIbge?.name, uf].filter(Boolean).join(" • "));

      if (data.results.length > 0) {
        toast.success(
          `${data.results.length} empresas encontradas${data.nextToken ? " (mais disponíveis)" : ""}`
        );
      } else if (data.rawTotal > 0) {
        toast.warning(
          `Encontrei ${data.rawTotal} empresas, mas nenhuma passou nos filtros locais.`,
          {
            description: "Relaxe o filtro de telefone/email, bairro ou cidade.",
            duration: 15000,
          }
        );
      } else {
        toast.warning("Nenhuma empresa encontrada com esses filtros.", {
          description: "Tente relaxar a UF, remover filtros avançados ou mudar o CNAE.",
          duration: 10000,
        });
      }
    } catch {
      toast.error("Erro na requisição");
    }
    setSearching(false);
  };

  const handleLoadMore = async () => {
    if (!nextToken) return;
    setLoadingMore(true);
    try {
      const r = await fetch("/api/cnpj/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(nextToken)),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error || "Erro ao carregar mais");
        setLoadingMore(false);
        return;
      }
      const existing = new Set(results.map((r) => r.cnpj));
      const newOnes = (data.results as CNPJCompany[]).filter((c) => !existing.has(c.cnpj));
      setResults((prev) => [...prev, ...newOnes]);
      setSelected((prev) => {
        const next = new Set(prev);
        newOnes.forEach((c) => next.add(c.cnpj));
        return next;
      });
      setNextToken(data.nextToken ?? null);
      toast.success(`+${newOnes.length} empresas`);
    } catch {
      toast.error("Erro ao carregar mais");
    }
    setLoadingMore(false);
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

  const toggleQsa = (cnpj: string) => {
    setExpandedQsa((prev) => {
      const next = new Set(prev);
      if (next.has(cnpj)) next.delete(cnpj);
      else next.add(cnpj);
      return next;
    });
  };

  const toggleCnae = (code: string) => {
    setCnaes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
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

    if (!r.success) {
      toast.error(r.error);
      setImporting(false);
      return;
    }

    const { created, skipped, createdLeadIds } = r.data!;

    // Enrollment automático em cadência, se escolhida.
    if (cadenceId && createdLeadIds.length > 0) {
      const enr = await enrollLeadsInCadence(cadenceId, createdLeadIds);
      if (enr.success) {
        toast.success(
          `${created} leads importados • ${enr.data?.enrolled ?? 0} inscritos na cadência${skipped > 0 ? ` • ${skipped} duplicados` : ""}`
        );
      } else {
        toast.warning(`${created} leads importados, mas cadência falhou: ${enr.error}`);
      }
    } else {
      toast.success(
        `${created} leads importados${skipped > 0 ? ` • ${skipped} duplicados ignorados` : ""}`
      );
    }

    setImporting(false);
    router.refresh();

    const importedCnpjs = new Set(toImport.map((c) => c.cnpj));
    setResults((prev) => prev.filter((c) => !importedCnpjs.has(c.cnpj)));
    setSelected(new Set());
  };

  const activeCadences = cadences.filter((c) => c.isActive);

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
              Busque empresas por atividade + região. Filtros avançados, score de qualificação e
              inscrição em cadência num clique.
            </p>
          </div>
        </div>

        {/* CNAEs selecionados (chips) */}
        <div>
          <label className="text-xs font-medium text-slate-700 mb-1 block">
            Atividades (CNAE) <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
            {cnaes.length === 0 && (
              <span className="text-xs text-slate-400 italic">
                Selecione ao menos uma atividade abaixo.
              </span>
            )}
            {cnaes.map((code) => {
              const opt = CNAE_OPTIONS.find((c) => c.code === code);
              return (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium"
                >
                  {opt?.label ?? code}
                  <button
                    type="button"
                    onClick={() => toggleCnae(code)}
                    className="hover:text-emerald-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) toggleCnae(e.target.value);
              e.target.value = "";
            }}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">+ Adicionar CNAE...</option>
            {cnaeGroups.map(([group, opts]) => (
              <optgroup key={group} label={group}>
                {opts
                  .filter((opt) => !cnaes.includes(opt.code))
                  .map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Localização */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                  {u.code} — {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-700 mb-1 block">Cidade</label>
            <CitiesAutocomplete
              uf={uf}
              value={cityIbge}
              onChange={setCityIbge}
              placeholder="Digite para buscar..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Bairro</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="opcional"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Básicos */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            <label className="text-xs font-medium text-slate-700 mb-1 block">DDD</label>
            <input
              type="text"
              value={ddd}
              onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="ex: 11"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
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

        {/* Filtros avançados (collapse) */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setAdvOpen((v) => !v)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
          >
            {advOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Filtros avançados (capital, data de abertura, Simples, MEI, CEP, matriz)
          </button>
          {advOpen && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Aberta a partir de
                </label>
                <input
                  type="date"
                  value={foundedFrom}
                  onChange={(e) => setFoundedFrom(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Aberta até</label>
                <input
                  type="date"
                  value={foundedTo}
                  onChange={(e) => setFoundedTo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Capital mín (R$)
                </label>
                <input
                  type="text"
                  value={equityMin}
                  onChange={(e) => setEquityMin(e.target.value.replace(/\D/g, ""))}
                  placeholder="ex: 50000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Capital máx (R$)
                </label>
                <input
                  type="text"
                  value={equityMax}
                  onChange={(e) => setEquityMax(e.target.value.replace(/\D/g, ""))}
                  placeholder="ex: 1000000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  CEP (início)
                </label>
                <input
                  type="text"
                  value={zipPrefix}
                  onChange={(e) => setZipPrefix(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="ex: 01000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">Simples</label>
                <select
                  value={simples}
                  onChange={(e) => setSimples(e.target.value as typeof simples)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="any">Qualquer</option>
                  <option value="yes">Só optantes</option>
                  <option value="no">Só não-optantes</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">MEI</label>
                <select
                  value={mei}
                  onChange={(e) => setMei(e.target.value as typeof mei)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="any">Qualquer</option>
                  <option value="yes">Só MEIs</option>
                  <option value="no">Excluir MEIs</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 pt-5">
                <input
                  type="checkbox"
                  checked={onlyHead}
                  onChange={(e) => setOnlyHead(e.target.checked)}
                  className="rounded"
                />
                Só matriz (sem filiais)
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSearch}
            disabled={searching || cnaes.length === 0 || !uf}
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
            {activeCadences.length > 0 && (
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs font-medium text-slate-700 mb-1 block inline-flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500" /> Cadência (opcional)
                </label>
                <select
                  value={cadenceId}
                  onChange={(e) => setCadenceId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Sem cadência —</option>
                  {activeCadences.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              {results.length} empresas · {selected.size} selecionadas ·{" "}
              <span className="text-slate-400">ordenadas por score</span>
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
              const qsaOpen = expandedQsa.has(c.cnpj);
              const score = c.score ?? 0;
              return (
                <div
                  key={c.cnpj}
                  className={`border rounded-xl p-3 transition-all ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50/30"
                      : "border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(c.cnpj)}
                      className="mt-1 rounded shrink-0"
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
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded border ${scoreColor(score)}`}
                            title="Score prévio de qualificação"
                          >
                            <Star className="h-2.5 w-2.5" />
                            {score}
                          </span>
                          <a
                            href={`https://www.google.com/maps/search/${encodeURIComponent(c.address || c.corporateName)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-indigo-600"
                            title="Ver no Google Maps"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                      {c.address && (
                        <p className="text-xs text-slate-500 flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </p>
                      )}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
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
                      </div>
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        {c.size && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {c.size}
                          </span>
                        )}
                        {c.capital != null && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {formatCapital(c.capital)}
                          </span>
                        )}
                        {c.openedAt && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            desde {new Date(c.openedAt).getFullYear()}
                          </span>
                        )}
                        {c.simples && (
                          <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                            Simples
                          </span>
                        )}
                        {c.mei && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            MEI
                          </span>
                        )}
                        {c.isHead === false && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Filial
                          </span>
                        )}
                      </div>
                      {c.members && c.members.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleQsa(c.cnpj)}
                            className="text-[11px] text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            {qsaOpen ? "Ocultar" : "Ver"} sócios ({c.members.length})
                          </button>
                          {qsaOpen && (
                            <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500 pl-4 border-l border-slate-100">
                              {c.members.slice(0, 8).map((m, i) => (
                                <li key={i}>
                                  <strong>{m.name}</strong>
                                  {m.role && <span className="text-slate-400"> — {m.role}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {nextToken && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Carregar mais
                  </>
                )}
              </button>
            </div>
          )}
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
