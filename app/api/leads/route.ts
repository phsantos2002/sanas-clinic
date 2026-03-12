import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public API to create leads from landing pages with UTM tracking
// POST /api/leads
// Body: { userId, name, phone, source?, medium?, campaign?, adName?, platform?, referrer? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, phone, source, medium, campaign, adName, platform, referrer } = body;

    if (!userId || !name || !phone) {
      return NextResponse.json(
        { error: "userId, name, and phone are required" },
        { status: 400 }
      );
    }

    // Validate phone (only digits, 10-15 chars)
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Deduplication: check if lead with same phone already exists
    const phoneSuffix = cleanPhone.slice(-9);
    const existing = await prisma.lead.findFirst({
      where: {
        userId,
        phone: { endsWith: phoneSuffix },
      },
    });

    if (existing) {
      // Update attribution if not set yet
      if (!existing.source && source) {
        await prisma.lead.update({
          where: { id: existing.id },
          data: { source, medium, campaign, adName, platform, referrer },
        });
      }
      return NextResponse.json({ id: existing.id, created: false });
    }

    // Get first stage
    const firstStage = await prisma.stage.findFirst({
      where: { userId },
      orderBy: { order: "asc" },
    });

    const lead = await prisma.lead.create({
      data: {
        name,
        phone: cleanPhone,
        userId,
        stageId: firstStage?.id ?? null,
        source: source ?? null,
        medium: medium ?? null,
        campaign: campaign ?? null,
        adName: adName ?? null,
        platform: platform ?? null,
        referrer: referrer ?? null,
      },
    });

    if (firstStage) {
      await prisma.leadStageHistory.create({
        data: { leadId: lead.id, stageId: firstStage.id },
      });
    }

    return NextResponse.json({ id: lead.id, created: true }, { status: 201 });
  } catch (err) {
    console.error("[API leads]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
