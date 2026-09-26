import type { ProcuredLot, SourcingPlan } from "@/lib/procurement/types";
import type { StoreProfile } from "@/lib/store/types";
import type { StoreDNA } from "@/lib/types";
import { rfqSummaryLine } from "@/lib/rfq/format";
import type { Rfq } from "@/lib/rfq/types";

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
  matches: ProcuredLot[],
  plan: SourcingPlan,
  store?: StoreProfile,
  rfq?: Rfq
): Promise<string | null> {
  const config = resolveConfig();
  if (!config) return null;

  const context = matches.slice(0, 5).map((m) => ({
    title: m.lot.title,
    wholesaler: m.lot.wholesaler,
    grade: m.lot.grade,
    price: m.lot.wholesalePrice,
    fit: m.score,
    landedRoiPct: m.metrics.landedRoiPct,
    priceVsMarket: m.metrics.priceIndex,
    supplierScore: m.supplier.score,
    keySupplier: Boolean(m.supplier.keySupplier),
    rfqMatch: m.rfq?.score,
    rfqMisses: m.rfq?.checks.filter((c) => c.status !== "met").map((c) => `${c.label}: ${c.detail}`),
    decisionScore: m.metrics.decisionScore,
    policyStatus: m.policy.status,
    reasons: m.reasons
  }));
  const rfqContext = rfq && { summary: rfqSummaryLine(rfq), source: rfq.source };
  const planContext = {
    lines: plan.lines.map((l) => ({ title: l.title, list: l.listPrice, negotiated: l.estimatedPrice })),
    totalSpend: plan.totalSpend,
    savings: plan.estimatedSavings,
    landedProfit: plan.expectedLandedProfit,
    excluded: plan.excluded.slice(0, 3)
  };

  const storeContext = store && {
    name: store.name,
    domain: store.domain,
    vertical: store.vertical.label,
    fashionFit: store.fashionFit,
    size: store.size.label,
    suggestedBudget: store.size.suggestedBudget,
    categories: store.catalog.categories.slice(0, 8),
    maps: store.maps && { rating: store.maps.rating, reviews: store.maps.reviewCount, locality: store.maps.locality },
    seoDescription: store.seo.description ?? store.seo.ogDescription
  };

  const system =
    "You are LotPilot, a wholesale buying agent for UK indie secondhand fashion retailers. " +
    "Given a store brief and a pre-ranked list of wholesale lots, write a buyer's briefing in 3-4 sentences. " +
    "Name the top pick, the sourcing plan spend, negotiated savings, landed profit, and one policy exclusion if present. Do not invent lots or numbers. British English. No markdown headers. " +
    "If a store profile is given, a short store read-out is already shown, so do not repeat it. If fashionFit is false and the store is not electronics, say the matches are weak. For electronics stores, describe the refurbished tech plan. " +
    "If an RFQ is given, state how well the top pick meets it (rfqMatch percent) and name a key supplier the retailer has bought from before.";

  const user = JSON.stringify(
    { brief: dna.brief, dna, rfq: rfqContext, store: storeContext, rankedLots: context, sourcingPlan: planContext },
    null,
    2
  );

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

/** Ask the model for a single JSON object. Returns null on no key, timeout, HTTP error or bad JSON. */
export async function completeJson(system: string, user: string, timeoutMs = 6000): Promise<unknown> {
  const config = resolveConfig();
  if (!config) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const text =
      config.provider === "openai"
        ? await callOpenAI(config, system, user, controller.signal)
        : await callAnthropic(config, system, user, controller.signal);
    const json = text?.match(/\{[\s\S]*\}/)?.[0];
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
