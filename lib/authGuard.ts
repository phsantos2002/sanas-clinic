import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";

/**
 * Verifica que um recurso pertence ao usuário autenticado.
 * Uso: const lead = await ensureOwnership("lead", leadId);
 * Retorna null se não pertence ou não existe.
 */
export async function ensureOwnership(
  model: "lead" | "stage" | "workflow" | "socialPost" | "messageTemplate" | "broadcastCampaign" | "story" | "assetVault" | "studioProject" | "notification",
  resourceId: string
) {
  const user = await getCurrentUser();
  if (!user) return null;

  const modelMap: Record<string, unknown> = {
    lead: prisma.lead,
    stage: prisma.stage,
    workflow: prisma.workflow,
    socialPost: prisma.socialPost,
    messageTemplate: prisma.messageTemplate,
    broadcastCampaign: prisma.broadcastCampaign,
    story: prisma.story,
    assetVault: prisma.assetVault,
    studioProject: prisma.studioProject,
    notification: prisma.notification,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = modelMap[model] as any;
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
