import { rankLots } from "@/lib/matcher";
import { parseBrief } from "@/lib/parseBrief";
import { buildSummary } from "@/lib/summary";
import { generateLlmSummary, llmAvailable, llmModelName } from "@/lib/llm";
import { gbp } from "@/lib/format";
import { sanitizePolicy } from "@/lib/procurement/policy";
import { buildSourcingPlan, procureLot, rankProcured } from "@/lib/procurement/procure";
import { extractStoreProfile } from "@/lib/store/extract";
import type { StoreProfile } from "@/lib/store/types";
import type { AgentResult, StoreDNA } from "@/lib/types";

export const DEFAULT_BUDGET = 2000;

/**
 * Run the buying agent for a free-text brief under a buying policy.
 * Ranking, policy checks, negotiation and the sourcing plan are always
 * deterministic. If an LLM key is present the model writes the narrative.
 */
export async function runAgent(brief: string, policyInput?: unknown): Promise<AgentResult> {
  return runAgentFromDna(parseBrief(brief), policyInput);
}

/** Read a store URL, then buy for the extracted DNA with the size-based budget. */
export async function runAgentForStore(storeUrl: string, policyInput?: unknown): Promise<AgentResult> {
  const store = await extractStoreProfile(storeUrl);
  return runAgentFromDna({ ...store.dna, budget: store.size.suggestedBudget }, policyInput, store);
}

export async function runAgentFromDna(
  dna: StoreDNA,
  policyInput?: unknown,
  store?: StoreProfile
): Promise<AgentResult> {
  const policy = sanitizePolicy(policyInput);
  const budget = dna.budget ?? DEFAULT_BUDGET;

  const candidates = rankLots(dna, 12).map((m) => procureLot(m, policy, budget));
  const plan = buildSourcingPlan(candidates, policy, budget, dna.budget === undefined);
  const matches = rankProcured(candidates).slice(0, 6);

  const base = { dna, matches, plan, policy, ...(store ? { store } : {}) };
  const preface = store ? storePreface(store) : "";

  if (llmAvailable()) {
    const llmSummary = await generateLlmSummary(dna, matches, plan, store);
    if (llmSummary) {
      return { ...base, summary: joinSummary(preface, llmSummary), source: "llm", llmModel: llmModelName() };
    }
  }

  return { ...base, summary: joinSummary(preface, buildSummary(dna, matches, plan)), source: "deterministic" };
}

function storePreface(store: StoreProfile): string {
  const size = store.size.label.split(" · ")[0].toLowerCase();
  const read = `I read ${store.name} (${store.domain}): ${store.vertical.label.toLowerCase()}, ${size} store. I set the budget to ${gbp(
    store.size.suggestedBudget
  )} from the size estimate.`;
  if (store.fashionFit) return read;
  const vertical = store.vertical.label.toLowerCase();
  const article = /^[aeiou]/.test(vertical) ? "an" : "a";
  return `Heads up: the wholesale catalog is secondhand fashion, and ${store.name} looks like ${article} ${vertical} store, so these matches are weak. ${read}`;
}

const joinSummary = (preface: string, summary: string) => (preface ? `${preface} ${summary}` : summary);
