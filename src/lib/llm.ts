import type { LotScore, StoreDNA } from "@/lib/types";

interface LlmConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
}

function resolveConfig(): LlmConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini"
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest"
    };
  }
  return null;
}

export function llmAvailable(): boolean {
  return resolveConfig() !== null;
}

export function llmModelName(): string | undefined {
  return resolveConfig()?.model;
}

/**
 * Ask the LLM for a punchy buyer's summary of the already-ranked lots.
 * Ranking + economics stay deterministic; the model only writes the narration.
 * Returns null on any failure so callers fall back to canned reasoning.
 */
export async function generateLlmSummary(
  dna: StoreDNA,
  matches: LotScore[]
): Promise<string | null> {
  const config = resolveConfig();
  if (!config) return null;

  const context = matches.slice(0, 5).map((m) => ({
    title: m.lot.title,
    wholesaler: m.lot.wholesaler,
    grade: m.lot.grade,
    price: m.lot.wholesalePrice,
    fit: m.score,
    roiPct: Math.round(m.economics.roiPct),
    reasons: m.reasons
  }));

  const system =
    "You are LotPilot, an expert wholesale buying agent for UK indie secondhand fashion retailers. " +
    "Given a store brief and a pre-ranked list of wholesale lots, write a confident, concise buyer's briefing (3-4 sentences). " +
    "Reference the top pick, its ROI and budget fit. Do not invent lots or numbers beyond what is provided. British English, no markdown headers.";

  const user = JSON.stringify({ brief: dna.brief, dna, rankedLots: context }, null, 2);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const text =
      config.provider === "openai"
        ? await callOpenAI(config, system, user, controller.signal)
        : await callAnthropic(config, system, user, controller.signal);
    clearTimeout(timeout);
    return text?.trim() || null;
  } catch {
    return null;
  }
}

async function callOpenAI(
  config: LlmConfig,
  system: string,
  user: string,
  signal: AbortSignal
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.5,
      max_tokens: 320,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

async function callAnthropic(
  config: LlmConfig,
  system: string,
  user: string,
  signal: AbortSignal
): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 320,
      system,
      messages: [{ role: "user", content: user }]
    })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.content?.[0]?.text ?? null;
}
