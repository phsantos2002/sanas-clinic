import { getAttendants } from "@/app/actions/whatsappHub";
import { getServices } from "@/app/actions/services";
import { getCalendarConfig } from "@/app/actions/calendar";
import { getEventsByDay } from "@/app/actions/calendarEvents";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";

export default async function CalendarPage() {
  const today = new Date().toISOString().split("T")[0];

  const [attendants, services, calendarConfig, eventsResult] = await Promise.all([
    getAttendants(),
    getServices(),
    getCalendarConfig(),
    getEventsByDay(today),
  ]);

  const calendarConnected = !!calendarConfig?.connected;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Calendário</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Agenda dos atendentes em tempo real, sincronizada com Google Calendar
        </p>
      </div>

      <CalendarPageClient
        initialDate={today}
        initialEvents={eventsResult.events}
        attendants={attendants}
        services={services.map((s) => ({ id: s.id, name: s.name, duration: s.duration }))}
        calendarConnected={calendarConnected}
      />
    </div>
  );
}
