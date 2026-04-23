import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Append-only audit log helper. Non-throwing — never let audit failure
 * cascade into the main operation.
 *
 * Standard action taxonomy:
 *   "lead.transfer"        — assigning to attendant
 *   "lead.delete"          — deleting a lead
 *   "attendant.create"     — adding user
 *   "attendant.delete"     — removing user
 *   "attendant.role"       — changing role
 *   "funnel.create"        — creating funnel
 *   "funnel.delete"        — deleting funnel
 *   "ai.config_changed"    — saving AI config
 *   "lgpd.export"          — exporting data of a contact
 *   "lgpd.delete"          — deleting all data of a contact
 *   "broadcast.execute"    — running a broadcast campaign
 */
export async function logAudit(args: {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: args.userId,
        action: args.action,
        entityType: args.entityType ?? null,
        entityId: args.entityId ?? null,
        metadata: args.metadata ? (args.metadata as object) : undefined,
        ipAddress: args.ipAddress ?? null,
        userAgent: args.userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    logger.error("audit_log_failed", { err, action: args.action });
  }
}
