"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
  type CalendarEvent,
} from "@/app/actions/calendarEvents";
import type { AttendantData } from "@/app/actions/whatsappHub";

type ServiceLite = { id: string; name: string; duration: number };

type Props = {
  open: boolean;
  date: string; // YYYY-MM-DD
  attendants: AttendantData[];
  services: ServiceLite[];
  // Modo create: passa attendantId+hour+minute pré-preenchidos
  initialAttendantId?: string | null;
  initialHour?: number;
  initialMinute?: number;
  // Modo edit: passa o evento existente
  editingEvent?: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AppointmentModal({
  open,
  date,
  attendants,
  services,
  initialAttendantId,
  initialHour,
  initialMinute,
  editingEvent,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!editingEvent;
  const [pending, startTransition] = useTransition();

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [time, setTime] = useState(""); // HH:MM
  const [duration, setDuration] = useState(60);
  const [attendantId, setAttendantId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");

  // Hidrata estado quando modal abre
  useEffect(() => {
    if (!open) return;
    if (editingEvent) {
      setSummary(editingEvent.summary);
      setDescription(editingEvent.description ?? "");
      const start = new Date(editingEvent.start);
      const end = new Date(editingEvent.end);
      setTime(
        `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      );
      setDuration(Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)));
      setAttendantId(editingEvent.attendantId ?? "");
      setServiceId("");
    } else {
      setSummary("");
      setDescription("");
      setTime(
        `${String(initialHour ?? 9).padStart(2, "0")}:${String(initialMinute ?? 0).padStart(2, "0")}`
      );
      setDuration(60);
      setAttendantId(initialAttendantId ?? "");
      setServiceId("");
    }
  }, [open, editingEvent, initialAttendantId, initialHour, initialMinute]);

  // Quando seleciona serviço, preenche título + duração
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      if (!summary) setSummary(svc.name);
      setDuration(svc.duration || 60);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return toast.error("Título obrigatório");
    if (!time.match(/^\d{2}:\d{2}$/)) return toast.error("Horário inválido");

    const startDateTime = new Date(`${date}T${time}:00`).toISOString();

    startTransition(async () => {
      if (isEdit && editingEvent) {
        const res = await updateAppointment({
          eventId: editingEvent.id,
          changes: {
            summary,
            description,
            startDateTime,
            durationMinutes: duration,
            attendantId: attendantId || null,
          },
        });
        if (res.success) {
          toast.success("Agendamento atualizado");
          onSaved();
        } else toast.error(res.error || "Erro ao atualizar");
      } else {
        const res = await createAppointment({
          summary,
          description,
          startDateTime,
          durationMinutes: duration,
          attendantId: attendantId || undefined,
        });
        if (res.success) {
          toast.success("Agendamento criado");
          onSaved();
        } else toast.error(res.error || "Erro ao criar");
      }
    });
  };

  const handleDelete = () => {
    if (!editingEvent) return;
    if (!confirm(`Deletar o agendamento "${editingEvent.summary}"?`)) return;
    startTransition(async () => {
      const res = await deleteAppointment(editingEvent.id);
      if (res.success) {
        toast.success("Agendamento deletado");
        onSaved();
      } else toast.error(res.error || "Erro ao deletar");
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {isEdit ? "Editar agendamento" : "Novo agendamento"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {services.length > 0 && (
            <Field label="Serviço (opcional)">
              <select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Selecione pra preencher título e duração —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} min)
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Título">
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex: Manicure — Maria Silva"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </Field>
            <Field label="Duração (min)">
              <Input
                type="number"
                min={15}
                step={15}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              />
            </Field>
          </div>

          <Field label="Profissional">
            <select
              value={attendantId}
              onChange={(e) => setAttendantId(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Sem responsável —</option>
              {attendants
                .filter((a) => a.isActive)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.role ? ` (${a.role})` : ""}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Observações (opcional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Notas internas, contato do cliente, etc"
            />
          </Field>
        </form>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={pending}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Deletar
            </Button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }}
            >
              {pending ? "Salvando..." : isEdit ? "Atualizar" : "Agendar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
