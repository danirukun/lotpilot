import type { ResearchSource } from "@/lib/store/types";

export interface WholesaleLead {
  name: string;
  url: string;
  index: "thewholesaler" | "web";
  category: string;
  snippet: string;
  why: string;
  score: number;
}

export interface WholesaleResearch {
  query: string;
  leads: WholesaleLead[];
  sources: ResearchSource[];
  mode: "live" | "index" | "mixed";
  notes: string[];
  cached?: boolean;
  cachedAt?: string;
}
