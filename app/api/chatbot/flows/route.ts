import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { flowDefinitionSchema } from "@/lib/chatbot/engine";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createFlowSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.string().min(1).max(100),
  isActive: z.boolean().optional(),
  nodes: flowDefinitionSchema,
});

/**
 * GET /api/chatbot/flows  → list user's flows
 * POST /api/chatbot/flows → create a new flow
 *
 * Body shape (POST):
 *   { name, trigger, isActive?, nodes: { start, nodes: { [key]: nodeDef } } }
 */

async function authedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  return dbUser ?? null;
}

export async function GET() {
  const dbUser = await authedUser();
  if (!dbUser) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const flows = await prisma.chatbotFlow.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ flows });
}

export async function POST(req: NextRequest) {
  const dbUser = await authedUser();
  if (!dbUser) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createFlowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalido", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Validate that all referenced node keys exist
  const allKeys = new Set(Object.keys(parsed.data.nodes.nodes));
  if (!allKeys.has(parsed.data.nodes.start)) {
    return NextResponse.json(
      { error: `Node de inicio "${parsed.data.nodes.start}" nao existe` },
      { status: 400 }
    );
  }
  for (const [key, node] of Object.entries(parsed.data.nodes.nodes)) {
    if (node.next && !allKeys.has(node.next)) {
      return NextResponse.json(
        { error: `Node "${key}" referencia "${node.next}" que nao existe` },
        { status: 400 }
      );
    }
    if (node.buttons) {
      for (const b of node.buttons) {
        if (!allKeys.has(b.next)) {
          return NextResponse.json(
            { error: `Botao em "${key}" referencia "${b.next}" que nao existe` },
            { status: 400 }
          );
        }
      }
    }
  }

  const created = await prisma.chatbotFlow.create({
    data: {
      userId: dbUser.id,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      isActive: parsed.data.isActive ?? true,
      nodes: parsed.data.nodes,
    },
  });

  logAudit({
    userId: dbUser.id,
    action: "chatbot.flow_create",
    entityType: "ChatbotFlow",
    entityId: created.id,
    metadata: { name: parsed.data.name, trigger: parsed.data.trigger },
  }).catch(() => {});

  return NextResponse.json({ flow: created }, { status: 201 });
}
