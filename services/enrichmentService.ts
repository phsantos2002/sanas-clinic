import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export type EnrichResult = {
  ok: boolean;
  email?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  industry?: string;
  company?: string;
  confidence?: number; // 0-100
  provider: string;
  error?: string;
};

type Lead = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
};

/**
 * Look up missing lead info via the configured provider.
 * Uses the CLIENT's API key (stored in AIConfig).
 */
export async function enrichLead(userId: string, lead: Lead): Promise<EnrichResult> {
  const config = await prisma.aIConfig.findUnique({
    where: { userId },
    select: {
      enrichmentProvider: true,
      apolloApiKey: true,
      hunterApiKey: true,
    },
  });

  if (!config || !config.enrichmentProvider || config.enrichmentProvider === "none") {
    return { ok: false, provider: "none", error: "Enriquecimento não configurado" };
  }

  if (config.enrichmentProvider === "apollo") {
    if (!config.apolloApiKey) return { ok: false, provider: "apollo", error: "Chave Apollo ausente" };
    return enrichWithApollo(lead, config.apolloApiKey);
  }

  if (config.enrichmentProvider === "hunter") {
    if (!config.hunterApiKey) return { ok: false, provider: "hunter", error: "Chave Hunter ausente" };
    return enrichWithHunter(lead, config.hunterApiKey);
  }

  return { ok: false, provider: config.enrichmentProvider, error: "Provider desconhecido" };
}

// ─── Apollo.io ───────────────────────────────────────────────
// Docs: apolloapi.docs.apollo.io — People Search endpoint
async function enrichWithApollo(lead: Lead, apiKey: string): Promise<EnrichResult> {
  const [firstName, ...rest] = lead.name.split(" ");
  const lastName = rest.join(" ");

  try {
    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName || undefined,
        email: lead.email || undefined,
        organization_name: lead.company || undefined,
        reveal_personal_emails: false,
      }),
    });

    if (!res.ok) {
      return { ok: false, provider: "apollo", error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const person = data.person;
    if (!person) {
      return { ok: false, provider: "apollo", error: "Pessoa não encontrada" };
    }

    return {
      ok: true,
      provider: "apollo",
      email: person.email,
      jobTitle: person.title,
      linkedinUrl: person.linkedin_url,
      industry: person.organization?.industry,
      company: person.organization?.name ?? lead.company ?? undefined,
      confidence: 85,
    };
  } catch (err) {
    logger.warn("apollo_enrich_failed", { leadId: lead.id, err: String(err) });
    return { ok: false, provider: "apollo", error: err instanceof Error ? err.message : "erro" };
  }
}

// ─── Hunter.io ───────────────────────────────────────────────
// Docs: hunter.io/api-documentation
async function enrichWithHunter(lead: Lead, apiKey: string): Promise<EnrichResult> {
  const [firstName, ...rest] = lead.name.split(" ");
  const lastName = rest.join(" ");

  if (!lead.company) {
    return { ok: false, provider: "hunter", error: "Hunter requer empresa/domínio" };
  }

  try {
    const params = new URLSearchParams({
      company: lead.company,
      first_name: firstName,
      ...(lastName && { last_name: lastName }),
      api_key: apiKey,
    });

    const res = await fetch(`https://api.hunter.io/v2/email-finder?${params}`);
    if (!res.ok) {
      return { ok: false, provider: "hunter", error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const email = data?.data?.email;
    const score = data?.data?.score;
    if (!email) {
      return { ok: false, provider: "hunter", error: "Email não encontrado" };
    }

    return {
      ok: true,
      provider: "hunter",
      email,
      confidence: typeof score === "number" ? score : 50,
    };
  } catch (err) {
    logger.warn("hunter_enrich_failed", { leadId: lead.id, err: String(err) });
    return { ok: false, provider: "hunter", error: err instanceof Error ? err.message : "erro" };
  }
}

/**
 * Merge enrichment result into Lead row. Only fills empty fields.
 */
export async function applyEnrichmentToLead(
  leadId: string,
  userId: string,
  result: EnrichResult
): Promise<{ updated: string[] }> {
  if (!result.ok) return { updated: [] };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!lead) return { updated: [] };

  const updates: Record<string, string> = {};
  const changed: string[] = [];

  if (!lead.email && result.email) { updates.email = result.email; changed.push("email"); }
  if (!lead.jobTitle && result.jobTitle) { updates.jobTitle = result.jobTitle; changed.push("cargo"); }
  if (!lead.linkedinUrl && result.linkedinUrl) { updates.linkedinUrl = result.linkedinUrl; changed.push("linkedin"); }
  if (!lead.industry && result.industry) { updates.industry = result.industry; changed.push("setor"); }
  if (!lead.company && result.company) { updates.company = result.company; changed.push("empresa"); }

  if (Object.keys(updates).length) {
    await prisma.lead.update({ where: { id: leadId }, data: updates });
  }

  return { updated: changed };
}
