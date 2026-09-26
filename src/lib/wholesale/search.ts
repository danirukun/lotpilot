import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { hashEmbed } from "@/lib/wholesale/embed";
import type { WholesaleLead } from "@/lib/wholesale/types";

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
  if (hit.rank_semantic != null && hit.rank_semantic <= 5) bits.push("semantic match");
  if (hit.rank_fts != null && hit.rank_fts <= 5) bits.push("keyword match");
  if (hit.rank_trgm != null && hit.rank_trgm <= 5) bits.push("name match");
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
  matchCount = 6
): Promise<{ hits: HybridHit[]; model: string } | null> {
  const supabase = getSupabase();
  if (!supabase || !query.trim()) return null;

  // Must match ingest embedding model (local-hash-v1 unless re-ingested with OpenAI).
  const model =
    process.env.WHOLESALE_EMBED_MODEL?.trim() === "openai" ? "text-embedding-3-small" : "local-hash-v1";
  let embedding = hashEmbed(query);
  if (model === "text-embedding-3-small") {
    const { embedQuery } = await import("@/lib/wholesale/embed");
    const q = await embedQuery(query);
    embedding = q.embedding;
  }

  const { data, error } = await supabase.rpc("wholesale_hybrid_search", {
    query_text: query,
    query_embedding: embedding,
    match_count: matchCount,
    full_text_weight: 1,
    trigram_weight: 1,
    semantic_weight: 1.1,
    rrf_k: 60
  });

  if (error || !data) return null;
  return { hits: data as HybridHit[], model };
}

export function leadsFromHits(hits: HybridHit[]): WholesaleLead[] {
  return hits.map((hit) => ({
    name: hit.name,
    url: hit.url,
    index: hit.source.includes("wholesaler") ? "thewholesaler" : "web",
    category: hit.category || "Directory",
    snippet: (hit.content || "").replace(/\s+/g, " ").trim().slice(0, 180),
    why: whyFromHit(hit),
    score: scoreFromRrf(hit.rrf_score ?? 0)
  }));
}
