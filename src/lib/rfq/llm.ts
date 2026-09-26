import { completeJson } from "@/lib/llm";
import { AESTHETIC_KEYWORDS, CATEGORY_KEYWORDS } from "@/lib/parseBrief";
import type { Rfq } from "@/lib/rfq/types";

const SYSTEM =
  "You turn a UK secondhand-fashion retailer's wholesale brief into a structured RFQ. " +
  "Reply with one JSON object only, no prose. Keys: " +
  `categories (subset of ${JSON.stringify(Object.keys(CATEGORY_KEYWORDS))}), ` +
  `aesthetics (subset of ${JSON.stringify(Object.keys(AESTHETIC_KEYWORDS))}), ` +
  "pieceRange {min, max} (pieces per lot, integers or null), maxPricePerPiece (GBP number or null), " +
  "budget (total GBP number or null), gradeLetters (subset of [\"A\",\"B\",\"C\"]; C means mixed/unsorted), " +
  "gradeMode (\"required\" or \"preferred\"), brands (array of brand names). " +
  "Use null or [] when the brief does not say. Never invent constraints. A draft from a rule-based parser is given; correct it only where the brief clearly says otherwise.";

/** Ask the configured model for the RFQ as JSON. Returns null on any failure. */
export function llmParseRfq(brief: string, draft: Rfq): Promise<unknown> {
  const hint = {
    categories: draft.categories,
    aesthetics: draft.aesthetics,
    pieceRange: draft.pieceRange,
    maxPricePerPiece: draft.maxPricePerPiece ?? null,
    budget: draft.budget ?? null,
    gradeLetters: draft.gradeLetters,
    gradeMode: draft.gradeMode,
    brands: draft.brands
  };
  return completeJson(SYSTEM, JSON.stringify({ brief, draft: hint }), 6000);
}
