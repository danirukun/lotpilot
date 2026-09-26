import type { Category, Grade } from "@/lib/types";

/** Grade letters a retailer uses. C means mixed or unsorted stock. */
export type RfqGradeLetter = "A" | "B" | "C";

export interface Rfq {
  categories: Category[];
  aesthetics: string[];
  pieceRange: { min?: number; max?: number };
  maxPricePerPiece?: number;
  budget?: number;
  /** Retailer letters as stated, e.g. ["A", "B"]. */
  gradeLetters: RfqGradeLetter[];
  /** Catalog grades that satisfy the request. Empty means any grade. */
  grades: Grade[];
  /** "required" makes grade a hard constraint; "preferred" only ranks. */
  gradeMode: "required" | "preferred";
  brands: string[];
  source: "deterministic" | "llm" | "edited";
}

export type RfqCheckStatus = "met" | "partial" | "missed";

export interface RfqCheck {
  id: "style" | "pieces" | "price" | "budget" | "grade" | "brands";
  label: string;
  status: RfqCheckStatus;
  detail: string;
  /** 0..1 */
  satisfaction: number;
  /** Constraints the plan must not break. */
  hard: boolean;
}

export interface RfqMatch {
  /** 0..100 weighted constraint satisfaction. */
  score: number;
  checks: RfqCheck[];
  /** Weight of the RFQ score against vibe fit in the relevance blend, 0..1. */
  weight: number;
  /** Blend of RFQ score and vibe fit, 0..100. */
  relevance: number;
  /** Score the sourcing plan's weak-fit gate uses, 0..100. */
  gate: number;
  /** First hard constraint the lot misses, if any. */
  hardMiss?: RfqCheck;
}
