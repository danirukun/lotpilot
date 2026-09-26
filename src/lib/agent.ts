import { parseBrief } from "@/lib/parseBrief";
import { buildSummary } from "@/lib/summary";
import { generateLlmSummary, llmAvailable, llmModelName } from "@/lib/llm";
import { gbp } from "@/lib/format";
import { sanitizePolicy } from "@/lib/procurement/policy";
import { buildSourcingPlan, rankProcured } from "@/lib/procurement/procure";
import { resolvePersonaId } from "@/lib/procurement/keySuppliers";
import { llmParseRfq } from "@/lib/rfq/llm";
import { selectCandidates } from "@/lib/rfq/rank";
import { resolveRfq } from "@/lib/rfq/resolve";
import { resolveCatalog } from "@/lib/catalog";
import { extractStoreProfile } from "@/lib/store/extract";
import { researchWholesale } from "@/lib/wholesale/research";
import type { StoreProfile } from "@/lib/store/types";
import type { AgentResult, LotCatalog, StoreDNA } from "@/lib/types";
import type { ProgressReporter } from "@/lib/progress";

export const DEFAULT_BUDGET = 2000;

/**
 * Run the buying agent for a free-text brief under a buying policy.
 * Ranking, policy checks, negotiation and the sourcing plan are always
 * deterministic. If an LLM key is present the model writes the narrative.
 */
export async function runAgent(
  brief: string,
  policyInput?: unknown,
  opts: { rfq?: unknown; personaId?: unknown; refresh?: boolean; onProgress?: ProgressReporter } = {}
): Promise<AgentResult> {
  opts.onProgress?.({ stage: "profile", message: "Reading your shop brief" });
  return runAgentFromDna(parseBrief(brief), policyInput, undefined, {
    rfq: opts.rfq,
    personaId: resolvePersonaId(brief, opts.personaId),
    refresh: opts.refresh,
    onProgress: opts.onProgress
  });
}

/** Read a store URL, then buy for the extracted DNA with the size-based budget. */
export async function runAgentForStore(
  storeUrl: string,
  policyInput?: unknown,
  opts: { refresh?: boolean; onProgress?: ProgressReporter } = {}
): Promise<AgentResult> {
  opts.onProgress?.({ stage: "profile", message: "Reading the storefront and product collections" });
  const store = await extractStoreProfile(storeUrl, { refresh: opts.refresh });
  return runAgentFromDna({ ...store.dna, budget: store.size.suggestedBudget }, policyInput, store, {
    refresh: opts.refresh,
    onProgress: opts.onProgress
  });
}

export async function runAgentFromDna(
  dna: StoreDNA,
  policyInput?: unknown,
  store?: StoreProfile,
  opts: { rfq?: unknown; personaId?: string; refresh?: boolean; onProgress?: ProgressReporter } = {}
): Promise<AgentResult> {
  opts.onProgress?.({ stage: "requirements", message: "Checking your budget, grades and buying rules" });
  const policy = sanitizePolicy(policyInput);
  const rfq = await resolveRfq(dna, {
    override: opts.rfq,
    llmParse: llmAvailable() && !store ? llmParseRfq : undefined
  });
  const budget = rfq.budget ?? dna.budget ?? DEFAULT_BUDGET;

  const catalog: LotCatalog = store ? resolveCatalog(store) : "fashion";
  opts.onProgress?.({ stage: "matching", message: "Ranking demo lots and building a policy-compliant basket" });
  const candidates = selectCandidates(dna, rfq, policy, budget, opts.personaId, catalog);
  const budgetAssumed = rfq.budget === undefined && dna.budget === undefined;
  const nonFashionStore = Boolean(store && !store.fashionFit);
  const electronicsStore = catalog === "electronics";
  const planBudget = nonFashionStore && !electronicsStore ? Math.min(budget, 500) : budget;
  const plan = buildSourcingPlan(candidates, policy, planBudget, budgetAssumed, {
    ...(nonFashionStore && !electronicsStore
      ? { maxLines: 2, minFit: 55, exploratory: true }
      : {})
  });
  const matches = rankProcured(candidates).slice(0, 6);
  opts.onProgress?.({ stage: "research", message: "Searching UK wholesale directory sources" });
  const wholesale = await researchWholesale({
    ...dna, categories: rfq.categories, aesthetics: rfq.aesthetics, brands: rfq.brands
  }, store, { refresh: opts.refresh });
  opts.onProgress?.({ stage: "research", message: `${wholesale.leads.length} directory leads found${wholesale.cached ? " in saved research" : wholesale.mode === "rag" ? " in the live index" : " using fallback research"}` });
  opts.onProgress?.({ stage: "summary", message: "Preparing your buying brief and source links" });

  const base = {
    dna,
    rfq,
    matches,
    plan,
    policy,
    wholesale,
    ...(opts.personaId ? { personaId: opts.personaId } : {}),
    ...(store ? { store } : {})
  };
  const preface = store ? storePreface(store) : "";

  if (llmAvailable()) {
    const llmSummary = await generateLlmSummary(dna, matches, plan, store, rfq, wholesale);
    if (llmSummary) {
      return { ...base, summary: joinSummary(preface, llmSummary), source: "llm", llmModel: llmModelName() };
    }
  }

  return {
    ...base,
    summary: joinSummary(preface, buildSummary(dna, matches, plan, rfq, wholesale)),
    source: "deterministic"
  };
}

function storePreface(store: StoreProfile): string {
  const size = store.size.label.split(" · ")[0].toLowerCase();
  const read = `I read ${store.name} (${store.domain}): ${store.vertical.label.toLowerCase()}, ${size} store. I set the budget to ${gbp(
    store.size.suggestedBudget
  )} from the size estimate.`;
  if (store.fashionFit) return read;
  if (store.vertical.primary === "electronics") {
    return `${read} I matched refurbished tech wholesale lots to your ${store.vertical.label.toLowerCase()} focus.`;
  }
  const vertical = store.vertical.label.toLowerCase();
  const article = /^[aeiou]/.test(vertical) ? "an" : "a";
  return `Heads up: the wholesale catalog is secondhand fashion, and ${store.name} looks like ${article} ${vertical} store, so these matches are weak. ${read}`;
}

const joinSummary = (preface: string, summary: string) => (preface ? `${preface} ${summary}` : summary);
