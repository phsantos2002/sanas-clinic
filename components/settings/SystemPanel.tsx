"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  ShieldX,
  Trash2,
  Search,
  Loader2,
  Info,
  Stethoscope,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  resolveDLQEntry,
  getDLQEntry,
  lgpdLookup,
  type DLQEntry,
  type AuditEntry,
} from "@/app/actions/system";

type Tab = "dlq" | "audit" | "lgpd" | "diag";

type Props = {
  dlq: DLQEntry[];
  audit: AuditEntry[];
};

const ACTION_LABELS: Record<string, string> = {
  "lead.transfer": "Lead transferido",
  "lead.delete": "Lead excluído",
  "attendant.create": "Usuário criado",
  "attendant.delete": "Usuário removido",
  "attendant.role": "Papel alterado",
  "funnel.create": "Funil criado",
  "funnel.delete": "Funil excluído",
  "ai.config_changed": "IA configurada",
  "lgpd.export": "Dados exportados (LGPD)",
  "lgpd.delete": "Dados deletados (LGPD)",
  "broadcast.execute": "Disparo executado",
  "dlq.resolve": "DLQ marcado como resolvido",
  "chatbot.flow_create": "Chatbot flow criado",
};

export function SystemPanel({ dlq, audit }: Props) {
  const [tab, setTab] = useState<Tab>("dlq");

  return (
    <div className="space-y-4">
      {/* Inner tabs */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit">
        <TabButton active={tab === "dlq"} onClick={() => setTab("dlq")}>
          <AlertCircle className="h-3.5 w-3.5" />
          Webhooks falhados
          {dlq.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">
              {dlq.length}
            </span>
          )}
        </TabButton>
        <TabButton active={tab === "audit"} onClick={() => setTab("audit")}>
          <ClipboardList className="h-3.5 w-3.5" />
          Histórico de ações
        </TabButton>
        <TabButton active={tab === "lgpd"} onClick={() => setTab("lgpd")}>
          <ShieldX className="h-3.5 w-3.5" />
          LGPD
        </TabButton>
        <TabButton active={tab === "diag"} onClick={() => setTab("diag")}>
          <Stethoscope className="h-3.5 w-3.5" />
          Diagnóstico WhatsApp
        </TabButton>
      </div>

      {tab === "dlq" && <DLQTab entries={dlq} />}
      {tab === "audit" && <AuditTab entries={audit} />}
      {tab === "lgpd" && <LGPDTab />}
      {tab === "diag" && <DiagnosticTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

// ── DLQ ─────────────────────────────────────────────────────

function DLQTab({ entries }: { entries: DLQEntry[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<{ rawPayload: unknown; errorStack: string | null } | null>(
    null
  );
  const [loadingDetails, setLoadingDetails] = useState(false);

  async function handleOpen(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetails(null);
      return;
    }
    setOpenId(id);
    setLoadingDetails(true);
    const data = await getDLQEntry(id);
    setLoadingDetails(false);
    setDetails(data);
  }

  async function handleResolve(id: string) {
    const res = await resolveDLQEntry(id);
    if (res.success) {
      toast.success("Marcado como resolvido");
      startTransition(() => router.refresh());
    } else {
      toast.error(res.error);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
        <Check className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500 font-medium">Nenhum webhook falhado</p>
        <p className="text-xs text-slate-400 mt-1">
          Ingestão de webhooks está saudável. Falhas aparecem aqui para inspeção.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100">
      {entries.map((e) => {
        const isOpen = openId === e.id;
        return (
          <div key={e.id}>
            <button
              onClick={() => handleOpen(e.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span className="text-[10px] font-semibold uppercase bg-rose-50 text-rose-600 px-2 py-0.5 rounded shrink-0">
                {e.source}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{e.errorMessage}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(e.createdAt).toLocaleString("pt-BR")}
                  {e.phone && <span className="ml-2">· {e.phone}</span>}
                  {e.attempts > 1 && <span className="ml-2">· {e.attempts} tentativas</span>}
                </p>
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-3 bg-slate-50/50">
                {loadingDetails ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                  </p>
                ) : (
                  <>
                    {details?.errorStack && (
                      <details className="text-[11px]">
                        <summary className="cursor-pointer text-slate-600 font-medium">
                          Stack trace
                        </summary>
                        <pre className="mt-1 p-2 bg-white border border-slate-200 rounded text-[10px] overflow-auto max-h-48">
                          {details.errorStack}
                        </pre>
                      </details>
                    )}
                    <details className="text-[11px]" open>
                      <summary className="cursor-pointer text-slate-600 font-medium">
                        Payload bruto
                      </summary>
                      <pre className="mt-1 p-2 bg-white border border-slate-200 rounded text-[10px] overflow-auto max-h-64">
                        {JSON.stringify(details?.rawPayload, null, 2)}
                      </pre>
                    </details>
                  </>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleResolve(e.id)}
                    className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    <Check className="h-3 w-3" /> Marcar como resolvido
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Audit log ───────────────────────────────────────────────

function AuditTab({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
        <Info className="h-10 w-10 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Nenhuma ação registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl divide-y divide-slate-100">
      {entries.map((e) => (
        <div key={e.id} className="px-4 py-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-800">
                {ACTION_LABELS[e.action] ?? e.action}
              </p>
              {e.entityType && (
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {e.entityType}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {new Date(e.createdAt).toLocaleString("pt-BR")}
              {e.ipAddress && <span className="ml-2">· {e.ipAddress}</span>}
            </p>
          </div>
          {e.metadata != null && (
            <details className="text-[10px]">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-600">
                Detalhes
              </summary>
              <pre className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded text-[10px] overflow-auto max-h-40 max-w-xs">
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

// ── LGPD ────────────────────────────────────────────────────

function LGPDTab() {
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    leadId?: string;
    name?: string;
    messageCount?: number;
    createdAt?: Date;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSearch() {
    if (!phone.trim()) return;
    setSearching(true);
    setResult(null);
    setConfirmDelete(false);
    const data = await lgpdLookup(phone.trim());
    setSearching(false);
    setResult(data);
  }

  function handleExport() {
    const normalized = phone.replace(/\D/g, "");
    window.open(`/api/lgpd/export?phone=${normalized}`, "_blank");
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    const normalized = phone.replace(/\D/g, "");
    const res = await fetch(`/api/lgpd/delete?phone=${normalized}&confirm=true`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok && data.deleted) {
      toast.success("Dados deletados permanentemente");
      setResult(null);
      setPhone("");
      setConfirmDelete(false);
    } else {
      toast.error(data.error ?? data.reason ?? "Erro ao deletar");
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Solicitação LGPD</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Exporte ou delete TODOS os dados associados a um telefone (lead, mensagens, histórico,
            atribuições, eventos Pixel, emails).
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="DDI + DDD + número (ex: 5511987654321)"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !phone.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {result && !result.found && (
          <div className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
            Nenhum lead encontrado com esse telefone.
          </div>
        )}

        {result?.found && (
          <div className="border border-slate-100 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{result.name}</p>
              <p className="text-xs text-slate-500">
                {result.messageCount} mensagens · criado em{" "}
                {result.createdAt && new Date(result.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                <Download className="h-3.5 w-3.5" /> Exportar JSON
              </button>
              <button
                onClick={handleDelete}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                  confirmDelete
                    ? "bg-rose-700 text-white hover:bg-rose-800"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete ? "Confirmar exclusão" : "Deletar permanentemente"}
              </button>
            </div>
            {confirmDelete && (
              <p className="text-[11px] text-rose-600">
                ⚠ Ação irreversível. Clique novamente em 5s para confirmar.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Diagnostic ──────────────────────────────────────────────

function DiagnosticTab() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/whatsapp/uazapi-debug");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setRunning(false);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast.success("JSON copiado");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interpretation = (result as any)?.interpretation;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Diagnóstico Uazapi</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Roda chamadas exploratórias contra sua instância Uazapi para investigar problemas de
            carregamento de mensagens, status e endpoints disponíveis. Use o JSON para enviar ao
            suporte da Uazapi se necessário.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Diagnosticando...
              </>
            ) : (
              <>
                <Stethoscope className="h-3.5 w-3.5" /> Rodar diagnóstico
              </>
            )}
          </button>
          {result != null && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar JSON
            </button>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {interpretation && (
          <div
            className={`rounded-xl p-3 border ${
              interpretation.hasAnyMessageHistory
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <p className="text-sm font-semibold text-slate-900 mb-1">Conclusão automática</p>
            <p className="text-xs text-slate-700">{interpretation.likelyConclusion}</p>
            <ul className="text-[11px] text-slate-600 mt-2 space-y-0.5">
              <li>
                Instância acessível: <b>{interpretation.instanceReachable ? "sim" : "não"}</b>
              </li>
              <li>
                Histórico encontrado:{" "}
                <b>
                  {interpretation.hasAnyMessageHistory
                    ? `sim (${interpretation.sampleMessageCount} mensagens no probe)`
                    : "não"}
                </b>
              </li>
              {interpretation.filterDiagnostic && (
                <>
                  <li className="pt-1 border-t border-amber-200/40 mt-1">
                    <b>Diagnóstico de filtro chatid:</b>
                  </li>
                  <li>
                    String direta: <b>{interpretation.filterDiagnostic.directStringMatch}</b>{" "}
                    mensagens
                  </li>
                  <li>
                    $in: <b>{interpretation.filterDiagnostic.inOperatorMatch}</b> mensagens
                  </li>
                  <li>
                    $regex: <b>{interpretation.filterDiagnostic.regexMatch}</b> mensagens
                  </li>
                  <li>
                    Filtro funcional: <b>{interpretation.filterDiagnostic.workingFilter}</b>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        {result != null && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-600 font-medium">
              JSON completo (todos os probes)
            </summary>
            <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] overflow-auto max-h-[500px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
