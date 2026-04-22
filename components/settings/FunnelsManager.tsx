"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Star, StarOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  createFunnel,
  renameFunnel,
  deleteFunnel,
  setDefaultFunnel,
  type FunnelData,
} from "@/app/actions/funnels";
import { ManageStagesSection } from "./ManageStagesSection";
import type { Stage } from "@/types";
import type { AttendantData } from "@/app/actions/whatsappHub";

type Props = {
  funnels: FunnelData[];
  stages: Stage[];
  attendants?: AttendantData[];
  stageWorkflowCounts?: Record<string, number>;
};

export function FunnelsManager({
  funnels,
  stages,
  attendants = [],
  stageWorkflowCounts = {},
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(funnels[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [, startTransition] = useTransition();

  const selectedFunnel = funnels.find((f) => f.id === selectedId) ?? funnels[0];
  const selectedStages = selectedFunnel
    ? stages.filter((s) => s.funnelId === selectedFunnel.id)
    : [];

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const res = await createFunnel(name);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(`Funil "${name}" criado`);
    setNewName("");
    setCreating(false);
    if (res.data) setSelectedId(res.data.id);
    startTransition(() => router.refresh());
  }

  async function handleRename(id: string) {
    const name = renameValue.trim();
    if (!name) return;
    const res = await renameFunnel(id, name);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Funil renomeado");
    setRenamingId(null);
    startTransition(() => router.refresh());
  }

  async function handleDelete(f: FunnelData) {
    if (!confirm(`Excluir o funil "${f.name}"?`)) return;
    const res = await deleteFunnel(f.id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Funil excluido");
    if (selectedId === f.id) setSelectedId(funnels.find((x) => x.id !== f.id)?.id ?? "");
    startTransition(() => router.refresh());
  }

  async function handleSetDefault(id: string) {
    const res = await setDefaultFunnel(id);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Funil padrao definido");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-5">
      {/* Funnels row */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Funis</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Crie multiplos funis. Cada funil tem suas proprias colunas.
            </p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Novo funil
            </button>
          )}
        </div>

        {creating && (
          <div className="flex gap-2 pt-1">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Nome do funil (ex: B2C, B2B, Recuperacao)"
              className="flex-1 h-9 text-sm rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="h-9 px-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Criar
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="h-9 px-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        )}

        {funnels.length === 0 ? (
          <p className="text-sm text-slate-400 py-3">Nenhum funil ainda. Crie o primeiro.</p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {funnels.map((f) => {
              const isSelected = selectedFunnel?.id === f.id;
              const isRenaming = renamingId === f.id;
              return (
                <div
                  key={f.id}
                  className={`flex items-center gap-1 rounded-xl border px-2 py-1 text-sm transition-colors ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {isRenaming ? (
                    <>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(f.id);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="h-6 text-sm outline-none bg-transparent w-36"
                      />
                      <button
                        onClick={() => handleRename(f.id)}
                        className="p-0.5 text-green-600 hover:text-green-700"
                        title="Salvar"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setSelectedId(f.id)} className="font-medium px-1">
                        {f.name}
                      </button>
                      <span className="text-[10px] text-slate-400">{f.stageCount}</span>
                      {f.isDefault && (
                        <span title="Funil padrao">
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setRenamingId(f.id);
                          setRenameValue(f.name);
                        }}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        title="Renomear"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      {!f.isDefault && (
                        <button
                          onClick={() => handleSetDefault(f.id)}
                          className="p-0.5 text-slate-400 hover:text-amber-500"
                          title="Definir como padrao"
                        >
                          <StarOff className="h-3 w-3" />
                        </button>
                      )}
                      {!f.isDefault && (
                        <button
                          onClick={() => handleDelete(f)}
                          className="p-0.5 text-slate-400 hover:text-red-500"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected funnel's stages */}
      {selectedFunnel && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Colunas de &quot;{selectedFunnel.name}&quot;
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Cada coluna pode disparar um evento Meta ou nenhum.
            </p>
          </div>
          <ManageStagesSection
            stages={selectedStages}
            attendants={attendants}
            stageWorkflowCounts={stageWorkflowCounts}
            funnelId={selectedFunnel.id}
          />
        </div>
      )}
    </div>
  );
}
