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
  retrievedAt?: string;
  evidence?: { keywordRank: number | null; fuzzyRank: number | null; vectorRank: number | null };
}

export interface WholesaleResearch {
  query: string;
  leads: WholesaleLead[];
  sources: ResearchSource[];
  mode: "live" | "index" | "mixed" | "rag";
  notes: string[];
  cached?: boolean;
  cachedAt?: string;
  model?: string;
}
