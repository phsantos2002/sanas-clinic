"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateNavigator } from "./DateNavigator";
import { CalendarGrid } from "./CalendarGrid";
import { AppointmentModal } from "./AppointmentModal";
import { getEventsByDay, type CalendarEvent } from "@/app/actions/calendarEvents";
import type { AttendantData } from "@/app/actions/whatsappHub";

type ServiceLite = { id: string; name: string; duration: number };

type Props = {
  initialDate: string;
  initialEvents: CalendarEvent[];
  attendants: AttendantData[];
  services: ServiceLite[];
  calendarConnected: boolean;
};

export function CalendarPageClient({
  initialDate,
  initialEvents,
  attendants,
  services,
  calendarConnected,
}: Props) {
  const [date, setDate] = useState(initialDate);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [reloading, startReload] = useTransition();

  // Estado do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{
    attendantId: string | null;
    hour: number;
    minute: number;
  }>({ attendantId: null, hour: 9, minute: 0 });

  const reload = useCallback(
    (forDate?: string) => {
      const d = forDate ?? date;
      startReload(async () => {
        const res = await getEventsByDay(d);
        setEvents(res.events);
      });
    },
    [date]
  );

  // Reload quando a data muda
  useEffect(() => {
    reload(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const handleCellClick = (attendantId: string | null, hour: number, minute: number) => {
    if (!calendarConnected) return;
    setEditingEvent(null);
    setCreateDefaults({ attendantId, hour, minute });
    setModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setModalOpen(true);
  };

  const handleNewClick = () => {
    if (!calendarConnected) return;
    setEditingEvent(null);
    setCreateDefaults({ attendantId: null, hour: 9, minute: 0 });
    setModalOpen(true);
  };

  if (!calendarConnected) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
        <p className="text-base font-semibold text-slate-700">Conecte o Google Calendar</p>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          O calendário usa a sua conta do Google para guardar e sincronizar agendamentos com o
          celular. Conecte em{" "}
          <span className="font-medium text-indigo-600">Configurações → Meu Negócio</span>.
        </p>
        <Button asChild size="sm">
          <a href="/dashboard/settings/business">Ir para configurações</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <DateNavigator date={date} onChange={setDate} />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => reload()}
            disabled={reloading}
            className="h-9 w-9 p-0"
            aria-label="Recarregar"
          >
            <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
          </Button>
          <Button type="button" size="sm" onClick={handleNewClick} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Agendar
          </Button>
        </div>
      </div>

      {/* Grid */}
      <CalendarGrid
        date={date}
        attendants={attendants}
        events={events}
        onCellClick={handleCellClick}
        onEventClick={handleEventClick}
      />

      {/* Modal */}
      <AppointmentModal
        open={modalOpen}
        date={date}
        attendants={attendants}
        services={services}
        editingEvent={editingEvent}
        initialAttendantId={createDefaults.attendantId}
        initialHour={createDefaults.hour}
        initialMinute={createDefaults.minute}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          reload();
        }}
      />
    </div>
  );
}
