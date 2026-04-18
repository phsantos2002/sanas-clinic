// Thin LLM wrapper used by autonomous agents for reasoning.
// Uses the user's own AIConfig.apiKey (same pattern as services/aiAgents.ts).
//
// This is intentionally minimal — agents pass a full prompt with context baked in,
// we just execute it and return the text response.

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

type ReasonOptions = {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
};

export async function createReasoner(userId: string) {
  const config = await prisma.aIConfig.findUnique({ where: { userId } });

  if (!config?.apiKey) {
    // Return a stub that logs and throws — the agent can decide whether to skip
    // or fall back to deterministic logic.
    return async (_prompt: string, _opts?: ReasonOptions): Promise<string> => {
      throw new Error("AI_NOT_CONFIGURED: usuário não configurou chave de API em Configurações > IA");
    };
  }

  const apiKey = config.apiKey;
  const model = config.model || "gpt-4o-mini";
  const provider = config.provider || "openai";

  return async (prompt: string, opts: ReasonOptions = {}): Promise<string> => {
    const { temperature = 0.4, maxTokens = 1500, systemPrompt } = opts;

    if (provider === "openai" || provider === "gpt") {
      const messages = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        { role: "user" as const, content: prompt },
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        logger.error("autonomous_agent_reason_openai_error", {
          userId,
          status: res.status,
          err: err?.error?.message,
        });
        throw new Error(`LLM_ERROR: ${err?.error?.message || res.status}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() ?? "";
    }

    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              ...(systemPrompt
                ? [{ role: "user", parts: [{ text: systemPrompt }] }]
                : []),
              { role: "user", parts: [{ text: prompt }] },
            ],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        logger.error("autonomous_agent_reason_gemini_error", { userId, status: res.status, err });
        throw new Error(`LLM_ERROR: ${res.status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    }

    throw new Error(`Provider '${provider}' não suportado em autonomous agents`);
  };
}

// Parse JSON safely from LLM output (handles markdown code fences)
export function parseJsonFromLLM<T = unknown>(raw: string): T | null {
  if (!raw) return null;

  // Remove markdown code fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the first JSON object/array from the text
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
