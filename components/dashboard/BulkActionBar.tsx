"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, Users, Tag as TagIcon, Repeat, Trash2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { bulkMoveStage, bulkAssign, bulkAddTag, bulkDeleteLeads } from "@/app/actions/bulkActions";
import { enrollLeadsInCadence } from "@/app/actions/cadences";
import type { Stage } from "@/types";

type Attendant = { id: string; name: string; role: string };
type Cadence = { id: string; name: string };

type Props = {
  selectedIds: string[];
  stages: Stage[];
  attendants: Attendant[];
  cadences: Cadence[];
  onClear: () => void;
};

export function BulkActionBar({ selectedIds, stages, attendants, cadences, onClear }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState<null | "stage" | "assign" | "tag" | "cadence" | "delete">(null);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);

  if (selectedIds.length === 0) return null;

  const closeMenu = () => setMenu(null);

  const handleMoveStage = async (stageId: string) => {
    setBusy(true);
    const r = await bulkMoveStage(selectedIds, stageId);
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`${r.data!.moved} leads movidos`);
    closeMenu();
    onClear();
    router.refresh();
  };

  const handleAssign = async (attendantId: string | null) => {
    setBusy(true);
    const r = await bulkAssign(selectedIds, attendantId);
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`${r.data!.assigned} leads atribuídos`);
    closeMenu();
    onClear();
    router.refresh();
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;
    setBusy(true);
    const r = await bulkAddTag(selectedIds, tagInput.trim());
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`${r.data!.tagged} leads com tag "${tagInput.trim()}"`);
    setTagInput("");
    closeMenu();
    onClear();
    router.refresh();
  };

  const handleEnroll = async (cadenceId: string) => {
    setBusy(true);
    const r = await enrollLeadsInCadence(cadenceId, selectedIds);
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`${r.data!.enrolled} inscritos, ${r.data!.skipped} ignorados`);
    closeMenu();
    onClear();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Excluir ${selectedIds.length} leads? Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    const r = await bulkDeleteLeads(selectedIds);
    setBusy(false);
    if (!r.success) {
      toast.error(r.error);
      return;
    }
    toast.success(`${r.data!.deleted} leads excluídos`);
    closeMenu();
    onClear();
    router.refresh();
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      {/* Menu flutuante */}
      {menu && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-2xl shadow-xl min-w-[280px] max-w-[360px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {menu === "stage" && (
            <div className="py-1.5 max-h-60 overflow-y-auto">
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Mover para
              </p>
              {stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleMoveStage(s.id)}
                  disabled={busy}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {menu === "assign" && (
            <div className="py-1.5 max-h-60 overflow-y-auto">
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Atribuir a
              </p>
              <button
                onClick={() => handleAssign("auto")}
                disabled={busy}
                className="w-full px-4 py-2 text-left text-sm text-indigo-600 font-medium hover:bg-indigo-50 disabled:opacity-50"
              >
                Distribuir automaticamente (round-robin)
              </button>
              <button
                onClick={() => handleAssign(null)}
                disabled={busy}
                className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                Remover atribuição
              </button>
              <div className="border-t border-slate-100 my-1" />
              {attendants.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAssign(a.id)}
                  disabled={busy}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                  {a.name}
                  <span className="text-[10px] text-slate-400 ml-1.5">{a.role}</span>
                </button>
              ))}
              {attendants.length === 0 && (
                <p className="px-4 py-2 text-xs text-slate-400">Nenhum atendente cadastrado.</p>
              )}
            </div>
          )}

          {menu === "tag" && (
            <div className="p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Adicionar tag
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  placeholder="nome da tag"
                  autoFocus
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddTag}
                  disabled={busy || !tagInput.trim()}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {menu === "cadence" && (
            <div className="py-1.5 max-h-60 overflow-y-auto">
              <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Inscrever em cadência
              </p>
              {cadences.length === 0 ? (
                <p className="px-4 py-2 text-xs text-slate-400">
                  Nenhuma cadência criada.{" "}
                  <a
                    href="/dashboard/settings/tools/cadencias/nova"
                    className="text-indigo-600 hover:underline"
                  >
                    Criar
                  </a>
                </p>
              ) : (
                cadences.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleEnroll(c.id)}
                    disabled={busy}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 disabled:opacity-50 truncate"
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-3 py-2 flex items-center gap-1.5">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-700">
          <span className="text-xs font-semibold tabular-nums">
            {selectedIds.length} selecionado{selectedIds.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={onClear}
            className="h-6 w-6 rounded hover:bg-slate-700 flex items-center justify-center"
            title="Limpar seleção"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <BarButton
          icon={ArrowRight}
          label="Mover"
          active={menu === "stage"}
          onClick={() => setMenu(menu === "stage" ? null : "stage")}
        />
        <BarButton
          icon={Users}
          label="Atribuir"
          active={menu === "assign"}
          onClick={() => setMenu(menu === "assign" ? null : "assign")}
        />
        <BarButton
          icon={TagIcon}
          label="Tag"
          active={menu === "tag"}
          onClick={() => setMenu(menu === "tag" ? null : "tag")}
        />
        <BarButton
          icon={Repeat}
          label="Cadência"
          active={menu === "cadence"}
          onClick={() => setMenu(menu === "cadence" ? null : "cadence")}
        />
        <button
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </div>
  );
}

function BarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof X;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active ? "bg-white text-slate-900" : "hover:bg-slate-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
      <ChevronDown className={`h-3 w-3 transition-transform ${active ? "rotate-180" : ""}`} />
    </button>
  );
}
