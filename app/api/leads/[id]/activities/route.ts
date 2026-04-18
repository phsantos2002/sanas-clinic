import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getLeadActivities } from "@/services/leadActivity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });

  // Ownership check
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: dbUser.id },
    select: { id: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });

  const activities = await getLeadActivities(leadId, dbUser.id, 200);
  return NextResponse.json({ activities });
}
