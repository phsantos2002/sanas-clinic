import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * Debug endpoint to test the AI response pipeline.
 * GET  /api/debug/ai-test — Returns diagnostic info
 * POST /api/debug/ai-test — Fix webhook URL
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  try {
    // 1. Check auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    // 5. Check webhook URL from Uazapi
    if (waConfig?.uazapiServerUrl && waConfig?.uazapiInstanceToken) {
      try {
        const webhookRes = await fetch(`${waConfig.uazapiServerUrl}/webhook`, {
          headers: { token: waConfig.uazapiInstanceToken },
        });
        const webhookData = await webhookRes.json().catch(() => ({}));
        // Uazapi returns the full webhook config — try multiple paths
        const webhookUrl =
          webhookData?.url || webhookData?.webhook?.url || webhookData?.webhookUrl || null;
        const webhookEnabled = webhookData?.enabled ?? webhookData?.webhook?.enabled ?? null;
        diagnostics.webhook = {
          status: webhookRes.status,
          url: webhookUrl ?? "NOT SET",
          enabled: webhookEnabled,
          rawResponse: webhookData,
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
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        lead: { select: { name: true, phone: true } },
      },
    });
    diagnostics.recentMessages = recentMessages.map((m) => ({
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

/**
 * POST /api/debug/ai-test — Fix webhook URL in Uazapi (tries multiple formats)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!dbUser) return NextResponse.json({ error: "DB user not found" });

    const waConfig = await prisma.whatsAppConfig.findFirst({ where: { userId: dbUser.id } });
    if (!waConfig?.uazapiServerUrl || !waConfig?.uazapiInstanceToken) {
      return NextResponse.json({ error: "WhatsApp not configured" });
    }

    const rawServerUrl = waConfig.uazapiServerUrl || "";
    const serverUrl = rawServerUrl.trim().replace(/\/+$/, "");
    const token = (waConfig.uazapiInstanceToken || "").trim();
    const instanceName = (waConfig.uazapiInstanceName || "").trim();
    const adminToken = (process.env.UAZAPI_ADMIN_TOKEN || "").trim();
    const webhookUrl = "https://sanas-clinic-l235.vercel.app/api/webhook/evolution";
    const results: Record<string, unknown> = { serverUrl, instanceName, webhookUrl };

    // Fix: Clean serverUrl in DB if it has whitespace/newlines
    if (rawServerUrl !== serverUrl) {
      await prisma.whatsAppConfig.update({
        where: { id: waConfig.id },
        data: { uazapiServerUrl: serverUrl },
      });
      results.fixedServerUrl = { old: JSON.stringify(rawServerUrl), new: serverUrl };
    }

    // --- Try OLD format (header: token) ---
    try {
      const getRes = await fetch(`${serverUrl}/webhook`, { headers: { token } });
      results.oldFormat_GET = {
        status: getRes.status,
        body: await getRes.json().catch(() => getRes.text()),
      };
    } catch (err) {
      results.oldFormat_GET = { error: String(err) };
    }

    // --- Try NEW format (Authorization: Bearer, /instance/NAME/webhook) ---
    if (instanceName) {
      // GET webhook via new format
      try {
        const getRes = await fetch(`${serverUrl}/instance/${instanceName}/webhook`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.newFormat_GET = {
          status: getRes.status,
          body: await getRes.json().catch(() => getRes.text()),
        };
      } catch (err) {
        results.newFormat_GET = { error: String(err) };
      }

      // SET webhook via new format
      try {
        const setRes = await fetch(`${serverUrl}/instance/${instanceName}/webhook`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ["messages"],
            excludeEvents: ["wasSentByApi", "isGroupYes"],
          }),
        });
        results.newFormat_SET = {
          status: setRes.status,
          body: await setRes.json().catch(() => setRes.text()),
        };
      } catch (err) {
        results.newFormat_SET = { error: String(err) };
      }
    } else {
      results.newFormat = "SKIP — no instanceName stored in DB";
    }

    // --- Also try SET with old format ---
    try {
      const setRes = await fetch(`${serverUrl}/webhook`, {
        method: "POST",
        headers: { token, "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: true,
          url: webhookUrl,
          events: ["messages"],
          excludeMessages: ["wasSentByApi"],
        }),
      });
      results.oldFormat_SET = {
        status: setRes.status,
        body: await setRes.json().catch(() => setRes.text()),
      };
    } catch (err) {
      results.oldFormat_SET = { error: String(err) };
    }

    // --- Try with admin token if available ---
    if (adminToken && instanceName) {
      try {
        const setRes = await fetch(`${serverUrl}/instance/${instanceName}/webhook`, {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ["messages"],
            excludeEvents: ["wasSentByApi"],
          }),
        });
        results.adminFormat_SET = {
          status: setRes.status,
          body: await setRes.json().catch(() => setRes.text()),
        };
      } catch (err) {
        results.adminFormat_SET = { error: String(err) };
      }
    }

    // --- Instance status ---
    try {
      const statusRes = await fetch(`${serverUrl}/instance/status`, { headers: { token } });
      results.instanceStatus_old = await statusRes.json().catch(() => statusRes.text());
    } catch (err) {
      results.instanceStatus_old = { error: String(err) };
    }

    if (instanceName) {
      try {
        const statusRes = await fetch(`${serverUrl}/instance/${instanceName}/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.instanceStatus_new = await statusRes.json().catch(() => statusRes.text());
      } catch (err) {
        results.instanceStatus_new = { error: String(err) };
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
