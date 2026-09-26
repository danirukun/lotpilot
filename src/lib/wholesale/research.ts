import type { StoreDNA } from "@/lib/types";
import type { StoreProfile, Vertical } from "@/lib/store/types";
import { leadsFromHits, searchWholesaleRag } from "@/lib/wholesale/search";
import type { WholesaleResearch } from "@/lib/wholesale/types";
export type { WholesaleLead, WholesaleResearch } from "@/lib/wholesale/types";

const cache = new Map<string, { expires: number; result: WholesaleResearch }>();
const termsFor = (dna: StoreDNA) => [...new Set([
  ...dna.categories.flatMap(c => c === "tees-tops" ? ["tees", "tops"] : [c]),
  ...dna.aesthetics, ...dna.brands
].map(t => t.toLowerCase()))];

export function buildWholesaleQuery(dna: StoreDNA, _store?: StoreProfile): string {
  // Vintage describes the stock condition, not an optional alternative to denim.
  const terms = termsFor(dna).filter(t => t !== "vintage");
  const quoted = terms.map(t => `"${t.replace(/"/g, "")}"`);
  if (dna.aesthetics.includes("vintage")) {
    return quoted.length ? quoted.map(t => `vintage ${t} OR secondhand ${t} OR "second hand" ${t}`).join(" OR ") : 'vintage OR secondhand OR "second hand"';
  }
  return quoted.join(" OR ");
}

/** Live indexed sources only. A missing source is a gap, never permission to use fixtures. */
export async function researchWholesale(dna: StoreDNA, store?: StoreProfile, opts: { refresh?: boolean; vertical?: Vertical } = {}): Promise<WholesaleResearch> {
  const query = buildWholesaleQuery(dna, store);
  const vertical = opts.vertical ?? store?.vertical.primary;
  const key = JSON.stringify([2, process.env.NEXT_PUBLIC_SUPABASE_URL, query, vertical]);
  const cached = cache.get(key);
  if (!opts.refresh && cached && cached.expires > Date.now()) return { ...cached.result, cached: true };
  const rag = query ? await searchWholesaleRag(query, 6, vertical, dna.aesthetics.includes("vintage")) : null;
  const result: WholesaleResearch = {
    query, leads: rag ? leadsFromHits(rag.hits) : [], sources: [], mode: rag ? "rag" : "unavailable",
    status: rag ? rag.hits.length ? "ok" : "empty" : "unavailable", model: "lexical-rrf-v2",
    notes: [rag ? "RRF fuses full-text and fuzzy-text ranks over fetched source descriptions. No hash vectors or invented aesthetic tags are used." : "Live source retrieval is unavailable or no supported query could be formed; no fixtures substituted."],
    cached: false, cachedAt: new Date().toISOString()
  };
  result.sources = result.leads.map(lead => ({ title: lead.name, url: lead.sourceUrl ?? lead.url }));
  if (rag) {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 5 * 60_000, result });
  }
  return result;
}
