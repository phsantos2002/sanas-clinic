"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Megaphone, Play, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createBroadcast, executeBroadcast, deleteBroadcast, type BroadcastData } from "@/app/actions/whatsappHub";
import type { Stage } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-600", icon: Clock },
  sending: { label: "Enviando", color: "bg-blue-100 text-blue-700", icon: Clock },
  completed: { label: "Concluido", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export function BroadcastClient({ broadcasts, stages }: { broadcasts: BroadcastData[]; stages: Stage[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [filterTags, setFilterTags] = useState("");
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [filterStageId, setFilterStageId] = useState("");
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !message.trim()) return;
    setCreating(true);
    const filters: Record<string, unknown> = {};
    if (filterTags.trim()) filters.tags = filterTags.split(",").map((t) => t.trim()).filter(Boolean);
    if (filterScoreMin > 0) filters.scoreMin = filterScoreMin;
    if (filterStageId) filters.stageIds = [filterStageId];

    const result = await createBroadcast({ name: name.trim(), message: message.trim(), filters: Object.keys(filters).length > 0 ? filters as { tags?: string[]; scoreMin?: number; stageIds?: string[] } : undefined });
    setCreating(false);
    if (result.success) { toast.success("Campanha criada!"); setShowCreate(false); router.refresh(); }
    else toast.error(result.success ? "Erro" : result.error);
  };

  const handleExecute = async (id: string) => {
    if (!confirm("Enviar mensagens agora? Isso nao pode ser desfeito.")) return;
    setExecuting(id);
    const result = await executeBroadcast(id);
    setExecuting(null);
    if (result.success && result.data) {
      toast.success(`Enviadas: ${result.data.sent}, Falhas: ${result.data.failed}`);
      router.refresh();
    } else toast.error(result.success ? "Erro" : result.error);
  };

  const handleDelete = async (id: string) => {
    await deleteBroadcast(id);
    toast.success("Campanha excluida");
    router.refresh();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Broadcasting</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Nova Campanha
        </button>
      </div>

      {broadcasts.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <Megaphone className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhuma campanha de broadcast.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((bc) => {
            const statusCfg = STATUS_CONFIG[bc.status] || STATUS_CONFIG.draft;
            return (
              <div key={bc.id} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 text-sm">{bc.name}</h4>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{bc.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                      <span>{bc.totalLeads} leads</span>
                      {bc.sentCount > 0 && <span className="text-green-600">{bc.sentCount} enviadas</span>}
                      {bc.failedCount > 0 && <span className="text-red-500">{bc.failedCount} falhas</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bc.status === "draft" && (
                      <button onClick={() => handleExecute(bc.id)} disabled={executing === bc.id}
                        className="h-8 w-8 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(bc.id)} className="h-8 w-8 rounded-lg hover:bg-red-50 flex items-center justify-center">
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="font-semibold text-slate-900">Nova Campanha de Broadcast</h3>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da campanha"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
              placeholder="Ola {{nome}}! Temos novidades para voce..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Filtros (opcional)</p>
              <input type="text" value={filterTags} onChange={(e) => setFilterTags(e.target.value)} placeholder="Tags (ex: vip, retorno)"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400">Score minimo</label>
                  <input type="number" value={filterScoreMin} onChange={(e) => setFilterScoreMin(Number(e.target.value))} min={0} max={100}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Estagio</label>
                  <select value={filterStageId} onChange={(e) => setFilterStageId(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                    <option value="">Todos</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleCreate} disabled={creating || !name.trim() || !message.trim()}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {creating ? "Criando..." : "Criar Campanha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
