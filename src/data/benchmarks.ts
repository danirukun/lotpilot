export interface MarketBenchmark {
  /** Median price per piece for comparable lots traded in the last 90 days, GBP. */
  marketPricePerPiece: number;
  comparables: number;
}

/** Seeded 90-day comparable-lot benchmarks, keyed by lot id. */
export const BENCHMARKS: Record<string, MarketBenchmark> = {
  "lot-001": { marketPricePerPiece: 8.5, comparables: 34 },
  "lot-002": { marketPricePerPiece: 22, comparables: 41 },
  "lot-003": { marketPricePerPiece: 9.5, comparables: 28 },
  "lot-004": { marketPricePerPiece: 31, comparables: 22 },
  "lot-005": { marketPricePerPiece: 9, comparables: 17 },
  "lot-006": { marketPricePerPiece: 26, comparables: 12 },
  "lot-007": { marketPricePerPiece: 13, comparables: 19 },
  "lot-008": { marketPricePerPiece: 38, comparables: 15 },
  "lot-009": { marketPricePerPiece: 24, comparables: 26 },
  "lot-010": { marketPricePerPiece: 27, comparables: 21 },
  "lot-011": { marketPricePerPiece: 24, comparables: 18 },
  "lot-012": { marketPricePerPiece: 4.2, comparables: 30 },
  "lot-013": { marketPricePerPiece: 8.5, comparables: 24 },
  "lot-014": { marketPricePerPiece: 16, comparables: 29 },
  "lot-015": { marketPricePerPiece: 17, comparables: 11 },
  "lot-016": { marketPricePerPiece: 28, comparables: 16 },
  "lot-017": { marketPricePerPiece: 25, comparables: 20 },
  "lot-018": { marketPricePerPiece: 14, comparables: 14 },
  "lot-019": { marketPricePerPiece: 28, comparables: 13 },
  "lot-020": { marketPricePerPiece: 13.5, comparables: 25 },
  "lot-021": { marketPricePerPiece: 12.5, comparables: 18 },
  "lot-022": { marketPricePerPiece: 20, comparables: 23 },
  "lot-023": { marketPricePerPiece: 33, comparables: 27 },
  "lot-024": { marketPricePerPiece: 6.2, comparables: 38 },
  "lot-025": { marketPricePerPiece: 55, comparables: 9 },
  "lot-026": { marketPricePerPiece: 10.5, comparables: 10 },
  "lot-027": { marketPricePerPiece: 4.5, comparables: 16 },
  "lot-028": { marketPricePerPiece: 9.2, comparables: 21 },
  "lot-029": { marketPricePerPiece: 13, comparables: 17 },
  "lot-030": { marketPricePerPiece: 40, comparables: 14 },
  "lot-031": { marketPricePerPiece: 13, comparables: 26 },
  "lot-032": { marketPricePerPiece: 30, comparables: 12 }
};
