import { prisma } from "@/lib/prisma";
import { getCurrentUser, resolveSession } from "@/app/actions/user";
import { isRestrictedRole } from "@/lib/session";

// Sentinela impossível de casar com um cuid — usada quando um papel restrito
// não tem attendantId (não deve acontecer, mas fecha o vazamento por segurança).
const NO_MATCH = "\0";

/**
 * Cláusula `where` de escopo de leads para a sessão atual.
 * - Dono/admin/manager: todos os leads do tenant.
 * - Vendedor/cs: apenas os leads atribuídos a ele (`assignedTo`).
 * Retorna null se não autenticado.
 */
export async function getLeadWhereScope(): Promise<
  { userId: string; assignedTo?: string } | null
> {
  const ctx = await resolveSession();
  if (!ctx) return null;

  if (isRestrictedRole(ctx.role)) {
    return { userId: ctx.tenantId, assignedTo: ctx.attendantId ?? NO_MATCH };
  }
  return { userId: ctx.tenantId };
}

/**
 * Verifica que um recurso pertence ao tenant autenticado.
 * Para `lead`, um vendedor restrito só "possui" leads atribuídos a ele.
 * Uso: const lead = await ensureOwnership("lead", leadId);
 * Retorna null se não pertence ou não existe.
 */
export async function ensureOwnership(
  model:
    | "lead"
    | "stage"
    | "workflow"
    | "socialPost"
    | "messageTemplate"
    | "broadcastCampaign"
    | "notification",
  resourceId: string
) {
  const ctx = await resolveSession();
  if (!ctx) return null;

  // Each model delegate has a compatible `findFirst` signature for this use case.
  // We use a minimal interface instead of `any` to preserve type safety on the call.
  type ModelDelegate = {
    findFirst(args: {
      where: { id: string; userId: string; assignedTo?: string };
    }): Promise<unknown>;
  };

  const modelMap: Record<string, ModelDelegate> = {
    lead: prisma.lead,
    stage: prisma.stage,
    workflow: prisma.workflow,
    socialPost: prisma.socialPost,
    messageTemplate: prisma.messageTemplate,
    broadcastCampaign: prisma.broadcastCampaign,
    notification: prisma.notification,
  };

  const prismaModel = modelMap[model];
  if (!prismaModel) return null;

  const where: { id: string; userId: string; assignedTo?: string } = {
    id: resourceId,
    userId: ctx.tenantId,
  };
  if (model === "lead" && isRestrictedRole(ctx.role)) {
    where.assignedTo = ctx.attendantId ?? NO_MATCH;
  }

  const resource = await prismaModel.findFirst({ where });

  return resource;
}

/**
 * Helper para obter o usuário (tenant) autenticado ou lançar erro.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nao autenticado");
  return user;
}

/**
 * Sessão com poder de gestão (dono/admin/manager). Retorna null para
 * vendedor/cs — use em ações sensíveis: CRUD de equipe, configs do tenant,
 * broadcast, reatribuição de leads.
 */
export async function requireManagerContext() {
  const ctx = await resolveSession();
  if (!ctx || isRestrictedRole(ctx.role)) return null;
  return ctx;
}
