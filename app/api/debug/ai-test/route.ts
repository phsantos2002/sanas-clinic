import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Debug endpoint to test the AI response pipeline.
 * GET /api/debug/ai-test
 * Returns diagnostic info about webhook, AI config, and lead status.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  try {
    // 1. Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    diagnostics.authUser = user.email;

    // 2. Check DB user
    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) {
      return NextResponse.json({ ...diagnostics, error: "DB user not found" });
    }
    diagnostics.userId = dbUser.id;

    // 3. Check AI Config
    const aiConfig = await prisma.aIConfig.findUnique({ where: { userId: dbUser.id } });
    diagnostics.aiConfig = {
      exists: !!aiConfig,
      provider: aiConfig?.provider ?? "N/A",
      model: aiConfig?.model ?? "N/A",
      hasApiKey: !!aiConfig?.apiKey,
      apiKeyLength: aiConfig?.apiKey?.length ?? 0,
      apiKeyPrefix: aiConfig?.apiKey?.slice(0, 7) ?? "N/A",
      clinicName: aiConfig?.clinicName ?? "N/A",
      hasSystemPrompt: !!aiConfig?.systemPrompt,
    };

    // 4. Check WhatsApp Config
    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { userId: dbUser.id } });
    diagnostics.whatsapp = {
      exists: !!waConfig,
      provider: waConfig?.provider ?? "N/A",
      hasServerUrl: !!waConfig?.uazapiServerUrl,
      hasInstanceToken: !!waConfig?.uazapiInstanceToken,
      instanceName: waConfig?.uazapiInstanceName ?? "N/A",
    };

    // 5. Check webhook URL
    if (waConfig?.uazapiServerUrl && waConfig?.uazapiInstanceToken) {
      try {
        const webhookRes = await fetch(`${waConfig.uazapiServerUrl}/webhook`, {
          headers: { token: waConfig.uazapiInstanceToken },
        });
        const webhookData = await webhookRes.json().catch(() => ({}));
        diagnostics.webhook = {
          status: webhookRes.status,
          url: webhookData?.url ?? webhookData?.webhook?.url ?? "N/A",
          enabled: webhookData?.enabled ?? webhookData?.webhook?.enabled ?? "N/A",
        };
      } catch (err) {
        diagnostics.webhook = { error: String(err) };
      }
    }

    // 6. Check recent leads
    const recentLeads = await prisma.lead.findMany({
      where: { userId: dbUser.id },
      orderBy: { lastInteractionAt: "desc" },
      take: 3,
      select: { id: true, name: true, phone: true, aiEnabled: true, lastInteractionAt: true },
    });
    diagnostics.recentLeads = recentLeads;

    // 7. Check recent messages
    const recentMessages = await prisma.message.findMany({
      where: { lead: { userId: dbUser.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, role: true, content: true, createdAt: true, lead: { select: { name: true, phone: true } } },
    });
    diagnostics.recentMessages = recentMessages.map(m => ({
      role: m.role,
      content: m.content.slice(0, 80),
      time: m.createdAt,
      lead: m.lead?.name ?? m.lead?.phone,
    }));

    // 8. Quick AI test (if config exists)
    if (aiConfig?.apiKey) {
      try {
        const { generateAIReply } = await import("@/services/aiChat");
        const testResult = await generateAIReply(
          [{ role: "user", content: "Oi, teste rapido" }],
          "Teste",
          {
            provider: aiConfig.provider,
            model: aiConfig.model,
            apiKey: aiConfig.apiKey,
            clinicName: aiConfig.clinicName,
            systemPrompt: aiConfig.systemPrompt,
          }
        );
        diagnostics.aiTest = {
          success: true,
          reply: testResult.reply.slice(0, 100),
          stage: testResult.newStageEventName,
        };
      } catch (err) {
        diagnostics.aiTest = { success: false, error: String(err) };
      }
    } else {
      diagnostics.aiTest = { success: false, error: "No API key configured" };
    }

    // 9. Pipeline stages
    const stages = await prisma.stage.findMany({
      where: { userId: dbUser.id },
      orderBy: { order: "asc" },
      select: { name: true, eventName: true, order: true },
    });
    diagnostics.stages = stages;

    return NextResponse.json(diagnostics);
  } catch (err) {
    return NextResponse.json({ ...diagnostics, error: String(err) }, { status: 500 });
  }
}
