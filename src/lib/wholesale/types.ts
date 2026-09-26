import type { ResearchSource } from "@/lib/store/types";

export interface WholesaleLead {
  name: string;
  url: string;
  index: "thewholesaler" | "web";
  category: string;
  snippet: string;
  why: string;
  score: number;
  kind?: "supplier" | "category";
  sourceUrl?: string;
  rrfScore?: number;
  retrievedAt?: string;
  evidence?: { keywordRank: number | null; fuzzyRank: number | null; vectorRank: number | null };
}

export interface WholesaleResearch {
  query: string;
  leads: WholesaleLead[];
  sources: ResearchSource[];
  mode: "live" | "index" | "mixed" | "rag" | "unavailable";
  status?: "ok" | "empty" | "unavailable" | "needs-input";
  notes: string[];
  cached?: boolean;
  cachedAt?: string;
  model?: string;
}
