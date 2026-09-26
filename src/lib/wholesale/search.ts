import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { hashEmbed } from "@/lib/wholesale/embed";
import type { WholesaleLead } from "@/lib/wholesale/types";
import type { Vertical } from "@/lib/store/types";

export type HybridHit = {
  id: number;
  source: string;
  external_id: string | null;
  name: string;
  url: string;
  category: string;
  verticals: string[];
  categories: string[];
  aesthetics: string[];
  content: string;
  scraped_at: string | null;
  rrf_score: number;
  rank_fts: number | null;
  rank_trgm: number | null;
  rank_semantic: number | null;
};

export function ragAvailable(): boolean {
  return supabaseConfigured();
}

function whyFromHit(hit: HybridHit): string {
  const bits: string[] = [];
  if (hit.rank_semantic != null && hit.rank_semantic <= 5) bits.push("keyword vector match");
  if (hit.rank_fts != null && hit.rank_fts <= 5) bits.push("keyword match");
  if (hit.rank_trgm != null && hit.rank_trgm <= 5) bits.push("fuzzy text match");
  if (hit.category) bits.push(hit.category);
  return bits.length ? bits.slice(0, 3).join(" · ") : "Directory RAG hit";
}

function scoreFromRrf(rrf: number): number {
  // Typical RRF tops out around ~0.05 for 3 lists; map to 0–100.
  return Math.max(1, Math.min(100, Math.round(rrf * 2500)));
}

/** Hybrid RRF search over the Supabase wholesale directory index. */
export async function searchWholesaleRag(
  query: string,
  matchCount = 6,
  vertical?: Vertical
): Promise<{ hits: HybridHit[]; model: string } | null> {
  if (!query.trim()) return null;
  // The shipped index uses hash vectors. Never silently mix embedding spaces.
  const configuredModel = process.env.WHOLESALE_EMBED_MODEL?.trim();
  const model = !configuredModel || configuredModel === "local-hash-v1" ? "local-hash-v1" : "keyword-only";
  const embedding = model === "local-hash-v1" ? hashEmbed(query.replace(/\bOR\b/g, " ")) : null;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("wholesale_hybrid_search", {
      query_text: query,
      query_embedding: embedding,
      match_count: 30,
      full_text_weight: 1,
      trigram_weight: 1,
      semantic_weight: embedding ? 1.1 : 0,
      rrf_k: 60
    }).abortSignal(AbortSignal.timeout(8000));

    if (error || !data) return null;
    const seen = new Set<string>();
    const hits = (data as HybridHit[]).filter(hit =>
      (!vertical || vertical === "general" || hit.verticals.includes(vertical)) &&
      // A nearest vector always exists, even for nonsense. Require lexical evidence.
      (hit.rank_fts != null || hit.rank_trgm != null)
    ).filter(hit => {
      const identity = hit.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }).slice(0, Math.min(30, Math.max(1, matchCount)));
    return { hits, model };
  } catch {
    return null;
  }
}

export function leadsFromHits(hits: HybridHit[]): WholesaleLead[] {
  return hits.map((hit) => ({
    name: hit.name,
    url: hit.url,
    index: hit.source.includes("wholesaler") ? "thewholesaler" : "web",
    category: hit.category || "Directory",
    snippet: (hit.content || "").replace(/\s+/g, " ").trim().slice(0, 180),
    why: whyFromHit(hit),
    score: scoreFromRrf(hit.rrf_score ?? 0),
    kind: hit.external_id?.startsWith("supplier-") ? "supplier" : "category",
    retrievedAt: hit.scraped_at ?? undefined,
    evidence: {
      keywordRank: hit.rank_fts,
      fuzzyRank: hit.rank_trgm,
      vectorRank: hit.rank_semantic
    }
  }));
}
