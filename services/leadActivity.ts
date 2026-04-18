import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type ActivityType =
  | "stage_change"
  | "assignment"
  | "tag_added"
  | "tag_removed"
  | "cadence_enrolled"
  | "cadence_stopped"
  | "email_sent"
  | "email_opened"
  | "note"
  | "enrichment"
  | "import"
  | "message_sent";

export type LogActivityArgs = {
  leadId: string;
  userId: string;
  type: ActivityType;
  summary: string;
  metadata?: Record<string, unknown>;
  actorType?: "system" | "user" | "ai";
  actorName?: string;
};

/**
 * Best-effort — never throws, never blocks the caller.
 * Used from server actions & services to record timeline events.
 */
export async function logLeadActivity(args: LogActivityArgs): Promise<void> {
  try {
    await prisma.leadActivity.create({
      data: {
        leadId: args.leadId,
        userId: args.userId,
        type: args.type,
        summary: args.summary,
        metadata: (args.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        actorType: args.actorType ?? "system",
        actorName: args.actorName ?? null,
      },
    });
  } catch {
    // no-op
  }
}

/**
 * Bulk log — for import batches / bulk assignments.
 */
export async function logBulkActivity(
  entries: LogActivityArgs[]
): Promise<void> {
  if (!entries.length) return;
  try {
    await prisma.leadActivity.createMany({
      data: entries.map((e) => ({
        leadId: e.leadId,
        userId: e.userId,
        type: e.type,
        summary: e.summary,
        metadata: (e.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        actorType: e.actorType ?? "system",
        actorName: e.actorName ?? null,
      })),
    });
  } catch {
    // no-op
  }
}

export async function getLeadActivities(leadId: string, userId: string, limit = 100) {
  return prisma.leadActivity.findMany({
    where: { leadId, userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
