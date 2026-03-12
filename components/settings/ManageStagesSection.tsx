"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { createStage, updateStage, deleteStage } from "@/app/actions/stages";
import { toast } from "sonner";
import type { Stage } from "@/types";

const FACEBOOK_EVENTS = [
  { value: "Lead", label: "Lead — cadastro de interesse" },
  { value: "Contact", label: "Contact — primeiro contato" },
  { value: "QualifiedLead", label: "QualifiedLead — lead qualificado" },
  { value: "Schedule", label: "Schedule — agendamento" },
  { value: "Purchase", label: "Purchase — compra / cliente" },
  { value: "CompleteRegistration", label: "CompleteRegistration — cadastro completo" },
  { value: "InitiateCheckout", label: "InitiateCheckout — início de checkout" },
  { value: "AddPaymentInfo", label: "AddPaymentInfo — info de pagamento" },
  { value: "Subscribe", label: "Subscribe — assinatura" },
  { value: "StartTrial", label: "StartTrial — início de trial" },
  { value: "SubmitApplication", label: "SubmitApplication — envio de formulário" },
  { value: "ViewContent", label: "ViewContent — visualização de conteúdo" },
];

type Props = {
  stages: Stage[];
};

type EditingState = {
  id: string;
  name: string;
  eventName: string;
};

export function ManageStagesSection({ stages }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [newName, setNewName] = useState("");
  const [newEvent, setNewEvent] = useState("Lead");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  function startEdit(stage: Stage) {
    setEditingId(stage.id);
    setEditing({ id: stage.id, name: stage.name, eventName: stage.eventName });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditing(null);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setLoading(true);
    const result = await updateStage(editing.id, {
      name: editing.name,
      eventName: editing.eventName,
    });
    setLoading(false);
    if (result.success) {
      toast.success("Coluna atualizada");
      cancelEdit();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(stageId: string, stageName: string) {
    if (!confirm(`Excluir a coluna "${stageName}"? Os leads desta coluna ficarão sem coluna.`)) return;
    const result = await deleteStage(stageId);
    if (result.success) {
      toast.success("Coluna excluída");
    } else {
      toast.error(result.error);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setLoading(true);
    const result = await createStage({ name: newName.trim(), eventName: newEvent });
    setLoading(false);
    if (result.success) {
      toast.success("Coluna criada");
      setNewName("");
      setNewEvent("Lead");
      setShowAdd(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-3 px-4 py-3">
            {editingId === stage.id && editing ? (
              <>
                <div className="flex-1 flex flex-col gap-1.5 sm:flex-row sm:gap-2">
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="h-8 text-sm"
                    placeholder="Nome da coluna"
                  />
                  <CustomSelect
                    options={FACEBOOK_EVENTS.map((ev) => ({ value: ev.value, label: ev.label }))}
                    value={editing.eventName}
                    onChange={(v) => setEditing({ ...editing, eventName: v })}
                    className="w-full sm:w-64"
                  />
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSaveEdit} disabled={loading}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={cancelEdit}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-sm font-medium">{stage.name}</p>
                  <p className="text-xs text-zinc-400">Evento: <span className="text-zinc-600 font-mono">{stage.eventName}</span></p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-black" onClick={() => startEdit(stage)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-600" onClick={() => handleDelete(stage.id, stage.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="rounded-lg border border-zinc-200 px-4 py-3 space-y-2">
          <p className="text-sm font-medium">Nova coluna</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da coluna"
              className="h-8 text-sm"
            />
            <CustomSelect
              options={FACEBOOK_EVENTS.map((ev) => ({ value: ev.value, label: ev.label }))}
              value={newEvent}
              onChange={setNewEvent}
              className="w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={loading || !newName.trim()}>
              Criar
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewName(""); setNewEvent("Lead"); }}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Nova coluna
        </Button>
      )}
    </div>
  );
}
