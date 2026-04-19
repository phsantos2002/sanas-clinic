import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";

/**
 * Verifica que um recurso pertence ao usuário autenticado.
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
  const user = await getCurrentUser();
  if (!user) return null;

  // Each model delegate has a compatible `findFirst` signature for this use case.
  // We use a minimal interface instead of `any` to preserve type safety on the call.
  type ModelDelegate = {
    findFirst(args: { where: { id: string; userId: string } }): Promise<unknown>;
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

  const resource = await prismaModel.findFirst({
    where: { id: resourceId, userId: user.id },
  });

  return resource;
}

/**
 * Helper para obter o usuário autenticado ou lançar erro.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Nao autenticado");
  return user;
}
