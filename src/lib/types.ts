import type { BuyingPolicy, ProcuredLot, SourcingPlan } from "@/lib/procurement/types";
import type { StoreProfile } from "@/lib/store/types";
import type { Rfq } from "@/lib/rfq/types";
import type { WholesaleResearch } from "@/lib/wholesale/types";

export type Grade = "A" | "B" | "AB" | "Mixed";

export type FashionCategory =
  | "denim"
  | "outerwear"
  | "knitwear"
  | "tees-tops"
  | "dresses"
  | "sportswear"
  | "accessories"
  | "footwear";

export type ElectronicsCategory =
  | "smartphones"
  | "laptops"
  | "headphones"
  | "cables-accessories"
  | "tablets"
  | "gaming"
  | "refurb-mixed";

export type TimepieceCategory = "watches" | "clocks";
export type Category = FashionCategory | ElectronicsCategory | TimepieceCategory;

export type LotCatalog = "fashion" | "electronics";

export interface WholesaleLot {
  id: string;
  title: string;
  wholesaler: string;
  /** Defaults to fashion when omitted (seeded fashion lots). */
  catalog?: LotCatalog;
  category: Category;
  grade: Grade;
  pieceCount: number;
  /** Total wholesale price for the whole lot, in GBP. */
  wholesalePrice: number;
  /** Suggested average resale price per piece, in GBP. */
  avgResale: number;
  /** Expected share of pieces that sell through, 0..1. */
  sellThrough: number;
  brands: string[];
  aesthetics: string[];
  decades: string[];
  location: string;
  image: string;
  blurb: string;
}

export interface StoreDNA {
  /** Free-text brief the retailer typed. */
  brief: string;
  aesthetics: string[];
  categories: Category[];
  brands: string[];
  decades: string[];
  /** Budget in GBP, if the retailer stated one. */
  budget?: number;
  location?: string;
  gradeFloor?: Grade;
}

export interface LotScore {
  lot: WholesaleLot;
  /** 0..100 overall fit score. */
  score: number;
  fitScore: number;
  marginScore: number;
  budgetFit: boolean;
  reasons: string[];
  economics: LotEconomics;
}

export interface LotEconomics {
  wholesalePrice: number;
  pricePerPiece: number;
  projectedRevenue: number;
  projectedProfit: number;
  marginPct: number;
  roiPct: number;
  expectedUnitsSold: number;
}

export interface AgentResult {
  dna: StoreDNA;
  matches: ProcuredLot[];
  plan: SourcingPlan;
  policy: BuyingPolicy;
  summary: string;
  source: "llm" | "deterministic" | "retrieval";
  llmModel?: string;
  /** Present when the run started from a store URL. */
  store?: StoreProfile;
  rfq: Rfq;
  /** UK wholesale directory leads (The Wholesaler UK and live search). */
  wholesale?: WholesaleResearch;
  /** Store persona detected from the brief, used for purchase history. */
  personaId?: string;
}

export interface OrderLine {
  lotId: string;
  title: string;
  wholesaler: string;
  listPrice: number;
  price: number;
  negotiated: boolean;
}

export interface Order {
  id: string;
  lines: OrderLine[];
  rejected: { lotId: string; title: string; reason: string }[];
  subtotalList: number;
  savings: number;
  shipping: number;
  amount: number;
  currency: "GBP";
  status: "confirmed";
  createdAt: string;
  estimatedDelivery: string;
  source: "commerce-layer" | "mock";
}
