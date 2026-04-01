"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./user";

export async function getNotifications(limit = 20) {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  return prisma.notification.count({
    where: { userId: user.id, read: false },
  });
}

export async function markAsRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });

  return { success: true };
}

export async function markAllAsRead() {
  const user = await getCurrentUser();
  if (!user) return { success: false };

  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });

  return { success: true };
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityId?: string;
  entityType?: string;
  actionUrl?: string;
}) {
  return prisma.notification.create({ data });
}
