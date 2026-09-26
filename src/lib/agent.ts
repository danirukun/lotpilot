import { parseBrief } from "@/lib/parseBrief";
import { gbp } from "@/lib/format";
import { sanitizePolicy } from "@/lib/procurement/policy";
import { buildSourcingPlan } from "@/lib/procurement/procure";
import { resolveRfq, sanitizeRfqPatch } from "@/lib/rfq/resolve";
import { extractStoreProfile } from "@/lib/store/extract";
import { classifyVertical, deriveDna } from "@/lib/store/classify";
import { deriveElectronicsCategories } from "@/lib/catalog";
import { researchWholesale } from "@/lib/wholesale/research";
import type { StoreProfile, Vertical } from "@/lib/store/types";
import type { AgentResult, StoreDNA } from "@/lib/types";
import type { ProgressReporter } from "@/lib/progress";
import type { WholesaleResearch } from "@/lib/wholesale/types";

export const DEFAULT_BUDGET = 2000;

export async function runAgent(brief: string, policyInput?: unknown,
  opts: { rfq?: unknown; personaId?: unknown; vertical?: Vertical; refresh?: boolean; onProgress?: ProgressReporter } = {}
): Promise<AgentResult> {
  opts.onProgress?.({ stage: "profile", message: "Reading your shop brief" });
  const parsed = parseBrief(brief);
  const corpus = { name: "", seo: brief, categories: "", catalog: "", mapsTypes: [] };
  const vertical = classifyVertical(corpus);
  const dna = { ...deriveDna(corpus, parsed.location, parsed.budget, brief), budget: parsed.budget, gradeFloor: parsed.gradeFloor };
  if (vertical.primary === "electronics") dna.categories = deriveElectronicsCategories(corpus);
  return runAgentFromDna(dna, policyInput, undefined, { ...opts, vertical: vertical.primary });
}

export async function runAgentForStore(storeUrl: string, policyInput?: unknown,
  opts: { rfq?: unknown; refresh?: boolean; onProgress?: ProgressReporter } = {}
): Promise<AgentResult> {
  opts.onProgress?.({ stage: "profile", message: "Reading storefront and relevant stock pages" });
  const store = await extractStoreProfile(storeUrl, { refresh: opts.refresh });
  return runAgentFromDna(store.dna, policyInput, store, opts);
}

export async function runAgentFromDna(dna: StoreDNA, policyInput?: unknown, store?: StoreProfile,
  opts: { rfq?: unknown; personaId?: unknown; vertical?: Vertical; refresh?: boolean; onProgress?: ProgressReporter } = {}
): Promise<AgentResult> {
  opts.onProgress?.({ stage: "requirements", message: "Checking product scope and your stated budget" });
  const policy = sanitizePolicy(policyInput);
  const rfq = await resolveRfq(dna, { override: opts.rfq });
  const budget = rfq.budget;
  const restricted = /\b(vap(?:e|es|ing)|e[- ]?liquids?|tobacco|nicotine|cigarettes?)\b/i.test(dna.brief);
  const noFocus = rfq.categories.length === 0 && rfq.aesthetics.length === 0 && rfq.brands.length === 0;
  const confirmedFocus = Boolean(sanitizeRfqPatch(opts.rfq)?.categories?.length);
  const market = store?.businessRole === "market-event" && !confirmedFocus;
  let reason: string | undefined;
  if (restricted) reason = "This product category is not supported. No sourcing or inventory recommendations were generated.";
  else if (store?.fetch.mode === "offline") reason = "The storefront could not be read. Please provide a current public stock page or describe your products.";
  else if (market) reason = "This site describes a vintage market or event, rather than a single retailer. Confirm your own product focus and current buying needs. Historical descriptions are shown as evidence, not current inventory.";
  else if (noFocus) reason = "The requested product category is not supported or is unclear. Describe the products you want to source; no clothing default has been applied.";

  opts.onProgress?.({ stage: "research", message: reason ? "Recording the sourcing coverage gap" : "Retrieving source documents with reciprocal rank fusion" });
  const wholesale: WholesaleResearch = reason
    ? { query: "", leads: [], sources: [], mode: "unavailable", notes: [reason], status: "needs-input" }
    : await researchWholesale({ ...dna, categories: rfq.categories, aesthetics: rfq.aesthetics, brands: rfq.brands }, store, { refresh: opts.refresh, vertical: opts.vertical });
  opts.onProgress?.({ stage: "research", message: `${wholesale.leads.length} evidence-backed supplier leads; no verified purchasable inventory` });

  // The live database holds source documents, not inventory, prices or supplier scorecards.
  // Never turn a directory record into a purchasable lot or fall back to demo LOTS.
  const plan = buildSourcingPlan([], policy, budget ?? 0, budget === undefined);
  const profile = store ? `Read ${store.name}: ${[...dna.aesthetics, ...dna.categories].join(", ") || "insufficient stock evidence"}.` : "";
  const budgetText = budget === undefined ? "Buying budget not provided." : `Your stated budget is ${gbp(budget)}.`;
  const sources = wholesale.leads.slice(0, 3).map((lead, i) => `${lead.name} [${i + 1}]`).join(", ");
  const finding = reason ?? (wholesale.status === "unavailable"
    ? "Supplier retrieval is unavailable. No saved or invented matches have been substituted."
    : sources ? `Retrieved relevant supplier sources: ${sources}. Their descriptions support the requested stock types; current availability, grades and prices need confirmation.`
    : "No verified supplier matches were found in the current index. No substitute lots have been generated.");
  const summary = [profile, budgetText, finding, reason ? "" : "No verified purchasable lots are available, so no price, margin, negotiation or buying plan is claimed."].filter(Boolean).join(" ");
  opts.onProgress?.({ stage: "summary", message: "Preparing your sourced findings and coverage gaps" });
  return { dna, rfq, policy, matches: [], plan, wholesale, summary, source: "retrieval", ...(store ? { store } : {}) };
}
