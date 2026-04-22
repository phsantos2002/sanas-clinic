"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, X, Download } from "lucide-react";
import { toast } from "sonner";
import { importLeadsBulk } from "@/app/actions/prospeccao";
import type { CsvLeadRow, ImportResult } from "@/app/actions/prospeccao";

type Attendant = { id: string; name: string; role: string };
type Stage = { id: string; name: string };

type Props = {
  attendants: Attendant[];
  stages: Stage[];
  lockedStage?: { id: string; name: string };
  onDone?: () => void;
};

const FIELDS: { key: keyof CsvLeadRow; label: string; required: boolean }[] = [
  { key: "name", label: "Nome", required: true },
  { key: "phone", label: "Telefone", required: true },
  { key: "email", label: "Email", required: false },
  { key: "company", label: "Empresa", required: false },
  { key: "jobTitle", label: "Cargo", required: false },
  { key: "linkedinUrl", label: "LinkedIn", required: false },
  { key: "industry", label: "Setor", required: false },
  { key: "city", label: "Cidade", required: false },
  { key: "notes", label: "Notas", required: false },
];

type Step = "upload" | "map" | "review" | "done";

export function CsvImportClient({ attendants, stages, lockedStage, onDone }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [defaultStageId, setDefaultStageId] = useState<string>(lockedStage?.id ?? "");
  const [extraTagsRaw, setExtraTagsRaw] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCsv = useCallback((text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return { headers: [], rows: [] };

    // Simple CSV parser (handles quoted values with commas)
    const parseLine = (line: string): string[] => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          out.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      out.push(current.trim());
      return out;
    };

    const parsedHeaders = parseLine(lines[0]);
    const parsedRows = lines.slice(1).map(parseLine);
    return { headers: parsedHeaders, rows: parsedRows };
  }, []);

  const autoMap = useCallback((hdrs: string[]) => {
    const map: Record<string, number | null> = {};
    const lower = hdrs.map((h) => h.toLowerCase().trim());

    const find = (candidates: string[]): number | null => {
      for (const c of candidates) {
        const idx = lower.findIndex((h) => h.includes(c));
        if (idx >= 0) return idx;
      }
      return null;
    };

    map.name = find(["nome", "name", "contato"]);
    map.phone = find(["telefone", "phone", "whatsapp", "celular", "fone"]);
    map.email = find(["email", "e-mail", "mail"]);
    map.company = find(["empresa", "company", "organizacao"]);
    map.jobTitle = find(["cargo", "title", "posicao", "funcao"]);
    map.linkedinUrl = find(["linkedin", "url"]);
    map.industry = find(["setor", "industry", "industria", "segmento"]);
    map.city = find(["cidade", "city"]);
    map.notes = find(["nota", "obs", "note", "comentario"]);

    return map;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        toast.error("Apenas arquivos .csv são suportados");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máx 5 MB)");
        return;
      }
      const text = await file.text();
      const { headers: hdrs, rows: rs } = parseCsv(text);

      if (hdrs.length === 0 || rs.length === 0) {
        toast.error("CSV vazio ou inválido");
        return;
      }

      setFileName(file.name);
      setHeaders(hdrs);
      setRows(rs);
      setMapping(autoMap(hdrs));
      setStep("map");
    },
    [parseCsv, autoMap]
  );

  const preview = useMemo(() => {
    if (!rows.length) return [];
    return rows.slice(0, 5).map((row) => {
      const obj: Partial<CsvLeadRow> = {};
      for (const f of FIELDS) {
        const idx = mapping[f.key];
        if (idx !== null && idx !== undefined && idx >= 0) {
          obj[f.key] = row[idx];
        }
      }
      return obj;
    });
  }, [rows, mapping]);

  const mappingValid = useMemo(() => {
    return FIELDS.filter((f) => f.required).every(
      (f) => mapping[f.key] !== null && mapping[f.key] !== undefined
    );
  }, [mapping]);

  const handleImport = async () => {
    setImporting(true);
    const mappedRows: CsvLeadRow[] = rows.map((row) => {
      const obj: CsvLeadRow = { name: "", phone: "" };
      for (const f of FIELDS) {
        const idx = mapping[f.key];
        if (idx !== null && idx !== undefined && idx >= 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (obj as any)[f.key] = row[idx] || undefined;
        }
      }
      return obj;
    });

    const extraTags = extraTagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const r = await importLeadsBulk({
      rows: mappedRows,
      assignedTo: assignedTo || null,
      extraTags,
      defaultStageId: defaultStageId || undefined,
    });
    setImporting(false);

    if (!r.success) {
      toast.error(r.error);
      return;
    }

    setResult(r.data!);
    setStep("done");
    toast.success(`${r.data!.created} leads importados`);
    router.refresh();
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  };

  const downloadTemplate = () => {
    const csv =
      "nome,telefone,email,empresa,cargo,linkedin,setor,cidade,notas\n" +
      "Joao Silva,11999999999,joao@exemplo.com,Empresa ABC,Diretor,https://linkedin.com/in/joao,Tecnologia,Sao Paulo,Indicado por Maria\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-leads-outbound.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-2">
        {(["upload", "map", "review", "done"] as Step[]).map((s, i) => {
          const active = step === s;
          const passed = (["upload", "map", "review", "done"] as Step[]).indexOf(step) > i;
          return (
            <div key={s} className="flex items-center">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  passed
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-8 ${passed ? "bg-green-500" : "bg-slate-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* STEP: UPLOAD */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-indigo-300 transition-colors"
          >
            <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 font-medium">
              Arraste seu CSV aqui ou clique para selecionar
            </p>
            <p className="text-xs text-slate-400 mt-1">Até 5 MB, 5.000 linhas</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 cursor-pointer"
            >
              Selecionar arquivo
            </label>
          </div>

          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600"
          >
            <Download className="h-3.5 w-3.5" /> Baixar modelo CSV
          </button>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
            <strong>Colunas aceitas:</strong> nome*, telefone*, email, empresa, cargo, linkedin,
            setor, cidade, notas. (*obrigatórias)
            <br />
            Leads duplicados pelo telefone são ignorados automaticamente.
          </div>
        </div>
      )}

      {/* STEP: MAP */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-slate-800">{fileName}</span>
              <span className="text-slate-400">— {rows.length} linhas</span>
            </div>
            <button
              onClick={reset}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-800">Mapear colunas</h3>
            <p className="text-xs text-slate-500">
              Associe cada campo do seu CSV ao campo correspondente no sistema.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-slate-700 mb-1 block">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f.key]: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Não mapear —</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {preview.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-700 mb-2">
                  Preview (primeiras 5 linhas)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {FIELDS.filter(
                          (f) => mapping[f.key] !== null && mapping[f.key] !== undefined
                        ).map((f) => (
                          <th
                            key={f.key}
                            className="px-2 py-1.5 text-left font-medium text-slate-600"
                          >
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          {FIELDS.filter(
                            (f) => mapping[f.key] !== null && mapping[f.key] !== undefined
                          ).map((f) => (
                            <td
                              key={f.key}
                              className="px-2 py-1.5 text-slate-600 truncate max-w-[160px]"
                            >
                              {row[f.key] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Voltar
            </button>
            <button
              onClick={() => setStep("review")}
              disabled={!mappingValid}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP: REVIEW */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-800">Configurações da importação</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
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
                        {a.name} ({a.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Estágio inicial
                </label>
                {lockedStage ? (
                  <div className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 text-slate-700">
                    {lockedStage.name}
                    <span className="text-[10px] text-slate-400 ml-2">
                      (coluna selecionada — evento Pixel desta coluna será disparado)
                    </span>
                  </div>
                ) : (
                  <select
                    value={defaultStageId}
                    onChange={(e) => setDefaultStageId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Primeiro estágio —</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-700 mb-1 block">
                  Tags extras (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={extraTagsRaw}
                  onChange={(e) => setExtraTagsRaw(e.target.value)}
                  placeholder="ex: campanha-q1, industria-saude"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tag &quot;outbound&quot; é adicionada automaticamente.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
              <strong>{rows.length} leads</strong> serão importados. Duplicados (mesmo telefone)
              serão ignorados.
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("map")}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Voltar
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-1.5 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {importing ? "Importando..." : "Importar agora"}
            </button>
          </div>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h3 className="font-semibold text-green-800">Importação concluída</h3>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div>
                <p className="text-2xl font-bold text-green-700">{result.created}</p>
                <p className="text-xs text-green-600">Criados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                <p className="text-xs text-amber-600">Duplicados (ignorados)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                <p className="text-xs text-red-600">Erros</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Erros ({result.errors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="text-xs text-slate-500">
                    Linha {e.row}: {e.reason}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Importar outra lista
            </button>
            {onDone ? (
              <button
                onClick={onDone}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                Fechar
              </button>
            ) : (
              <button
                onClick={() => router.push("/dashboard/pipeline?filter=outbound")}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                Ver no pipeline
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
