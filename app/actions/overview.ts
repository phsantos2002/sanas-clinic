"use server";

import { getCurrentUser } from "./user";
import { getUpcomingEvents } from "@/services/googleCalendar";

export type UpcomingMeeting = {
  id: string;
  summary: string;
  startISO: string;
  durationMin: number;
  whenLabel: string; // "Hoje 14h30" | "Amanhã 09h00"
  dayBucket: "today" | "tomorrow" | "later";
  location?: string;
};

export async function getUpcomingMeetings(): Promise<UpcomingMeeting[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const events = await getUpcomingEvents(user.id, 2);
  const now = new Date();
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const endTomorrow = new Date(endToday);
  endTomorrow.setDate(endTomorrow.getDate() + 1);

  return events
    .filter((e) => e.start?.dateTime)
    .map((e) => {
      const start = new Date(e.start!.dateTime!);
      const end = e.end?.dateTime ? new Date(e.end.dateTime) : start;
      const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

      let dayBucket: UpcomingMeeting["dayBucket"] = "later";
      let prefix = "";
      if (start <= endToday) {
        dayBucket = "today";
        prefix = "Hoje";
      } else if (start <= endTomorrow) {
        dayBucket = "tomorrow";
        prefix = "Amanhã";
      } else {
        prefix = start.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        });
      }

      const time = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      return {
        id: e.id || `${start.toISOString()}`,
        summary: e.summary || "(Sem título)",
        startISO: start.toISOString(),
        durationMin,
        whenLabel: `${prefix} ${time}`,
        dayBucket,
      };
    })
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
}
