import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import type { WholesaleLead } from "@/lib/wholesale/types";
import type { Vertical } from "@/lib/store/types";

export type HybridHit = {
  id: number; source: string; external_id: string | null; name: string; url: string;
  source_url?: string; category: string; verticals: string[]; categories: string[]; aesthetics: string[];
  content: string; scraped_at: string | null; rrf_score: number;
  rank_fts: number | null; rank_trgm: number | null; rank_semantic: number | null;
  evidence_version?: number;
};
export const ragAvailable = supabaseConfigured;
const hasVintageEvidence = (text: string) => /\b(vintage|second[- ]?hand|pre[- ]?loved|used clothing)\b/i.test(text);

export async function searchWholesaleRag(query: string, matchCount = 6, vertical?: Vertical, requireVintage = false): Promise<{ hits: HybridHit[]; model: string } | null> {
  if (!query.trim()) return null;
  try {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("wholesale_grounded_search", {
      query_text: query, match_count: 30, rrf_k: 60,
      vertical_filter: vertical === "general" ? null : vertical ?? null,
      require_vintage: requireVintage
    }).abortSignal(AbortSignal.timeout(8000));
    if (error || !data) return null;
    const seen = new Set<string>();
    const hits = (data as HybridHit[]).filter(hit => {
      if (hit.evidence_version !== 2 || !hit.source_url || !hit.scraped_at || !hit.content.trim()) return false;
      if (hit.rank_fts == null && hit.rank_trgm == null) return false;
      if (requireVintage && !hasVintageEvidence(hit.content)) return false;
      if (vertical && vertical !== "general" && !hit.verticals.includes(vertical)) return false;
      const identity = hit.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(identity)) return false;
      seen.add(identity); return true;
    }).slice(0, Math.min(30, Math.max(1, matchCount)));
    return { hits, model: "lexical-rrf-v2" };
  } catch { return null; }
}

export function leadsFromHits(hits: HybridHit[]): WholesaleLead[] {
  return hits.map(hit => ({
    name: hit.name, url: hit.url, sourceUrl: hit.source_url, index: hit.source.includes("wholesaler") ? "thewholesaler" : "web",
    category: hit.category || "Supplier profile", snippet: hit.content.replace(/\s+/g, " ").trim().slice(0, 600),
    why: "Source description retrieved by RRF", score: hit.rrf_score, rrfScore: hit.rrf_score,
    kind: hit.external_id?.startsWith("cat-") ? "category" : "supplier", retrievedAt: hit.scraped_at ?? undefined,
    evidence: { keywordRank: hit.rank_fts, fuzzyRank: hit.rank_trgm, vectorRank: null }
  }));
}
