"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  createQueue,
  deleteQueue,
  setQueueMembers,
  type QueueData,
} from "@/app/actions/queues";
import type { AttendantData } from "@/app/actions/whatsappHub";

type Props = {
  queues: QueueData[];
  attendants: AttendantData[];
};

const PRESET_COLORS = [
  "#3b82f6",
  "#16a34a",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#0ea5e9",
  "#64748b",
];

export function QueuesClient({ queues, attendants }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [greeting, setGreeting] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const result = await createQueue({ name: name.trim(), color, greeting: greeting.trim() });
    setCreating(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Setor criado");
    setShowCreate(false);
    setName("");
    setColor(PRESET_COLORS[0]);
    setGreeting("");
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    const result = await deleteQueue(id);
    if (!result.success) toast.error(result.error);
    else {
      toast.success("Setor removido");
      router.refresh();
    }
  };

  const toggleMember = async (queue: QueueData, attendantId: string) => {
    const next = queue.attendantIds.includes(attendantId)
      ? queue.attendantIds.filter((id) => id !== attendantId)
      : [...queue.attendantIds, attendantId];
    const result = await setQueueMembers(queue.id, next);
    if (!result.success) toast.error(result.error);
    else router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users2 className="h-4 w-4 text-indigo-500" /> Setores de atendimento
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Filas por departamento. Quando um lead pede atendente, entra na fila do setor do
            vendedor.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3.5 py-2 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Novo setor
        </button>
      </div>

      {queues.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <Users2 className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum setor ainda.</p>
          <p className="text-xs text-slate-400 mt-1">
            Sem setores, tudo cai numa fila geral — funciona, mas organizar por setor ajuda times
            maiores.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queues.map((q) => (
            <div key={q.id} className="bg-white border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-slate-200" />
                <div
                  className="h-8 w-8 rounded-lg shrink-0"
                  style={{ backgroundColor: q.color }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 text-sm">{q.name}</h4>
                  {q.greeting && (
                    <p className="text-xs text-slate-400 truncate">“{q.greeting}”</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="text-slate-300 hover:text-red-500"
                  title="Remover setor"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-[10px] font-medium text-slate-500 mb-1.5">Membros</p>
                <div className="flex flex-wrap gap-1.5">
                  {attendants.filter((a) => a.isActive).length === 0 ? (
                    <span className="text-xs text-slate-400">
                      Cadastre vendedores em Usuários primeiro.
                    </span>
                  ) : (
                    attendants
                      .filter((a) => a.isActive)
                      .map((a) => {
                        const active = q.attendantIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => toggleMember(q, a.id)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              active
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}
                          >
                            {a.name}
                          </button>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h3 className="font-semibold text-slate-900">Novo setor</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome (ex.: Vendas, Suporte)"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Cor</label>
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-lg transition-transform ${
                      color === c ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Mensagem de saudação ao entrar na fila (opcional)"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl"
              >
                {creating ? "Criando..." : "Criar setor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
