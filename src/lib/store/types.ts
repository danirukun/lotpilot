import type { StoreDNA } from "@/lib/types";

export type Platform = "shopify" | "woocommerce" | "squarespace" | "wix" | "bigcommerce" | "unknown";

export type Vertical =
  | "clothing"
  | "footwear"
  | "accessories"
  | "electronics"
  | "home"
  | "beauty"
  | "books-media"
  | "toys-games"
  | "sports-outdoor"
  | "food-drink"
  | "general";

export type SizeBucket = "unknown" | "micro" | "small" | "medium" | "large";

export interface SeoData {
  title?: string;
  description?: string;
  keywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  ogType?: string;
  twitterDescription?: string;
  canonical?: string;
  lang?: string;
  jsonLdTypes: string[];
}

export interface JsonLdBusiness {
  name?: string;
  locality?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  locations: number;
}

export interface MapsListing {
  name: string;
  address?: string;
  locality?: string;
  rating?: number;
  reviewCount?: number;
  types: string[];
  priceLevel?: string;
  mapsUrl?: string;
  source: "google-places" | "web-research" | "json-ld" | "fixture";
}

export interface CatalogData {
  categories: string[];
  /** Product types, tags and vendors from the storefront's product feed. */
  productTerms: string[];
  productCount?: number;
  productCountCapped: boolean;
  collectionCount?: number;
}

export interface VerticalScore {
  vertical: Vertical;
  score: number;
}

export interface StoreSignal {
  source: "name" | "seo" | "categories" | "catalog" | "maps" | "platform" | "research";
  label: string;
  value: string;
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface StoreResearch {
  answer?: string;
  sources: ResearchSource[];
}

export interface StoreProfile {
  url: string;
  domain: string;
  name: string;
  platform: Platform;
  seo: SeoData;
  catalog: CatalogData;
  maps: MapsListing | null;
  research: StoreResearch | null;
  vertical: { primary: Vertical; label: string; confidence: number; scores: VerticalScore[] };
  size: {
    bucket: SizeBucket;
    label: string;
    drivers: string[];
    suggestedBudget?: number;
    budgetRange?: [number, number];
  };
  evidence?: StorePageEvidence[];
  businessRole?: "retailer" | "market-event" | "unknown";
  freshness?: "historical" | "unverified";
  observedCategories?: string[];
  eraRanges?: string[];
  fashionFit: boolean;
  dna: StoreDNA;
  brief: string;
  signals: StoreSignal[];
  fetch: {
    mode: "live" | "fixture" | "offline";
    notes: string[];
    /** True when this profile was served from the storefront analysis cache. */
    cached?: boolean;
    cachedAt?: string;
  };
}

export interface StorePageEvidence {
  url: string;
  title: string;
  text: string;
  fetchedAt: string;
  publishedDates: string[];
  categories: string[];
  brands: string[];
  decades: string[];
}
