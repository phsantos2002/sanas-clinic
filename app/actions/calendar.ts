"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export async function getCalendarConfig() {
  const user = await getCurrentUser();
  if (!user) return null;

  const config = await prisma.googleCalendar.findUnique({ where: { userId: user.id } });
  if (!config) return null;

  return {
    connected: true,
    email: config.email,
    calendarId: config.calendarId,
    businessHoursStart: config.businessHoursStart,
    businessHoursEnd: config.businessHoursEnd,
    workDays: config.workDays,
    timezone: config.timezone,
  };
}

export async function saveCalendarConfig(data: {
  calendarId?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  workDays?: number[];
  timezone?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  const existing = await prisma.googleCalendar.findUnique({ where: { userId: user.id } });
  if (!existing) return { success: false, error: "Google Calendar não conectado" };

  await prisma.googleCalendar.update({
    where: { userId: user.id },
    data: {
      calendarId: data.calendarId || existing.calendarId,
      businessHoursStart: data.businessHoursStart || existing.businessHoursStart,
      businessHoursEnd: data.businessHoursEnd || existing.businessHoursEnd,
      workDays: data.workDays || existing.workDays,
      timezone: data.timezone || existing.timezone,
    },
  });

  revalidatePath("/dashboard/settings/business");
  return { success: true };
}

export async function disconnectCalendar() {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Não autenticado" };

  await prisma.googleCalendar.deleteMany({ where: { userId: user.id } });
  revalidatePath("/dashboard/settings/business");
  return { success: true };
}
