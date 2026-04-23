import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Chatbot engine — runs simple state-machine flows per lead.
 *
 * A flow is defined as a graph of nodes. Each node sends a message and
 * decides the next node based on user input (button id or free text).
 *
 * Designed to complement (not replace) the AI reply pipeline:
 *  - When a flow is active for a lead, AI is bypassed
 *  - Reaching a terminal node (no `next`) ends the flow and AI takes over
 *  - A node with `action: "pause_ai"` sets lead.aiEnabled=false (handoff)
 *
 * This module is intentionally pure logic — IO (DB, send) lives in the caller.
 */

const buttonSchema = z.object({
  label: z.string().min(1).max(40),
  next: z.string().min(1),
});

const nodeSchema = z.object({
  message: z.string().min(1),
  // For free-text response → next node
  next: z.string().optional(),
  // For button-driven branches
  buttons: z.array(buttonSchema).max(3).optional(),
  // Side effects
  action: z.enum(["pause_ai", "tag", "stage", "noop"]).optional(),
  actionArg: z.string().optional(),
});

export const flowDefinitionSchema = z.object({
  start: z.string().min(1),
  nodes: z.record(z.string(), nodeSchema),
});

export type FlowDefinition = z.infer<typeof flowDefinitionSchema>;
export type FlowNode = z.infer<typeof nodeSchema>;

/**
 * Find the active flow that matches a trigger for a user.
 */
export async function findFlowForTrigger(userId: string, trigger: string) {
  return prisma.chatbotFlow.findFirst({
    where: { userId, trigger, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get-or-init the chatbot state for (lead, flow).
 * If state exists, returns it. Otherwise creates one at the start node.
 */
export async function startOrResumeFlow(args: {
  leadId: string;
  flowId: string;
  flow: FlowDefinition;
}) {
  const existing = await prisma.chatbotState.findUnique({
    where: { leadId_flowId: { leadId: args.leadId, flowId: args.flowId } },
  });
  if (existing) return existing;

  return prisma.chatbotState.create({
    data: {
      leadId: args.leadId,
      flowId: args.flowId,
      currentNode: args.flow.start,
      context: {},
    },
  });
}

/**
 * Resolve the next node based on user input.
 * Returns null when the flow ends (no next defined and no matching button).
 */
export function resolveNextNode(currentNode: FlowNode, userInput: string): string | null {
  // Button match (case-insensitive label)
  if (currentNode.buttons && currentNode.buttons.length > 0) {
    const match = currentNode.buttons.find(
      (b) => b.label.toLowerCase() === userInput.trim().toLowerCase()
    );
    if (match) return match.next;
    // No match — repeat current node? For now, terminate the flow on mismatch
    return null;
  }
  return currentNode.next ?? null;
}

/**
 * Apply a node's side effect (pause AI, add tag, change stage).
 * Returns true if the flow should continue, false if it should terminate.
 */
export async function applyNodeAction(args: {
  node: FlowNode;
  leadId: string;
  userId: string;
}): Promise<boolean> {
  if (!args.node.action || args.node.action === "noop") return true;
  try {
    switch (args.node.action) {
      case "pause_ai":
        await prisma.lead.update({
          where: { id: args.leadId },
          data: { aiEnabled: false },
        });
        return false; // hand off to human — flow ends
      case "tag":
        if (args.node.actionArg) {
          const lead = await prisma.lead.findUnique({
            where: { id: args.leadId },
            select: { tags: true },
          });
          const tag = args.node.actionArg.toLowerCase();
          if (lead && !lead.tags.includes(tag)) {
            await prisma.lead.update({
              where: { id: args.leadId },
              data: { tags: { push: tag } },
            });
          }
        }
        return true;
      case "stage":
        if (args.node.actionArg) {
          const stage = await prisma.stage.findFirst({
            where: { id: args.node.actionArg, userId: args.userId },
          });
          if (stage) {
            await prisma.lead.update({
              where: { id: args.leadId },
              data: { stageId: stage.id },
            });
          }
        }
        return true;
    }
  } catch (err) {
    logger.error("chatbot_action_failed", { err, action: args.node.action });
  }
  return true;
}

/**
 * Advance the flow to the next node, persisting state.
 * Returns the new node's message to send, or null if flow ended.
 */
export async function advanceFlow(args: {
  state: { id: string; currentNode: string; context: unknown };
  flow: FlowDefinition;
  userInput: string;
  leadId: string;
  userId: string;
}): Promise<{ message: string; node: FlowNode } | null> {
  const currentNode = args.flow.nodes[args.state.currentNode];
  if (!currentNode) {
    // Stale state pointing to a node that no longer exists — terminate
    await prisma.chatbotState.delete({ where: { id: args.state.id } });
    return null;
  }

  const nextNodeKey = resolveNextNode(currentNode, args.userInput);
  if (!nextNodeKey) {
    await prisma.chatbotState.delete({ where: { id: args.state.id } });
    return null;
  }

  const nextNode = args.flow.nodes[nextNodeKey];
  if (!nextNode) {
    await prisma.chatbotState.delete({ where: { id: args.state.id } });
    return null;
  }

  // Apply side effect of the NEW node
  const shouldContinue = await applyNodeAction({
    node: nextNode,
    leadId: args.leadId,
    userId: args.userId,
  });

  if (!shouldContinue) {
    await prisma.chatbotState.delete({ where: { id: args.state.id } });
    return { message: nextNode.message, node: nextNode };
  }

  // Persist the move
  await prisma.chatbotState.update({
    where: { id: args.state.id },
    data: { currentNode: nextNodeKey, lastActivity: new Date() },
  });

  return { message: nextNode.message, node: nextNode };
}
