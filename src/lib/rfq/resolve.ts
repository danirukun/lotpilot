import { AESTHETIC_KEYWORDS, BRAND_DICTIONARY, CATEGORY_KEYWORDS } from "@/lib/parseBrief";
import type { Category, StoreDNA } from "@/lib/types";
import { lettersToGrades, parseRfq } from "@/lib/rfq/parse";
import type { Rfq, RfqGradeLetter } from "@/lib/rfq/types";

export interface RfqPatch {
  categories?: Category[];
  aesthetics?: string[];
  pieceRange?: Rfq["pieceRange"];
  maxPricePerPiece?: number | null;
  budget?: number | null;
  gradeLetters?: RfqGradeLetter[];
  gradeMode?: Rfq["gradeMode"];
  brands?: string[];
}

const LETTERS: RfqGradeLetter[] = ["A", "B", "C"];
const CATEGORIES = Object.keys(CATEGORY_KEYWORDS) as Category[];
const AESTHETICS = Object.keys(AESTHETIC_KEYWORDS);

const num = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "string" && v.trim() === "" ? NaN : Number(v);
  return v !== null && v !== undefined && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined;
};

const strings = (v: unknown, max = 8): string[] | undefined =>
  Array.isArray(v)
    ? v
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, max)
    : undefined;

const canonicalBrand = (b: string) =>
  BRAND_DICTIONARY.find((d) => d.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "")) ?? b;

/** Validate and clamp untrusted RFQ input (client override or LLM output). Unknown fields are dropped. */
export function sanitizeRfqPatch(input: unknown): RfqPatch | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const patch: RfqPatch = {};

  const range = (raw.pieceRange && typeof raw.pieceRange === "object" ? raw.pieceRange : raw) as Record<
    string,
    unknown
  >;
  const hasRange = ["min", "max", "pieceMin", "pieceMax"].some((k) => k in range) || "pieceRange" in raw;
  if (hasRange) {
    let min = num(range.min ?? range.pieceMin, 1, 5000);
    let max = num(range.max ?? range.pieceMax, 1, 5000);
    if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
    patch.pieceRange = {
      ...(min !== undefined ? { min: Math.round(min) } : {}),
      ...(max !== undefined ? { max: Math.round(max) } : {})
    };
  }
  const cleared = (v: unknown) => v === null || v === "";
  const price = num(raw.maxPricePerPiece, 0.5, 1000);
  if (price !== undefined || cleared(raw.maxPricePerPiece)) patch.maxPricePerPiece = price ?? null;
  const budget = num(raw.budget, 50, 100_000);
  if (budget !== undefined || cleared(raw.budget)) patch.budget = budget ?? null;

  const letters = strings(raw.gradeLetters ?? raw.grades, 3);
  if (letters) {
    patch.gradeLetters = LETTERS.filter((l) => letters.some((s) => s.toUpperCase() === l));
  }
  if (raw.gradeMode === "required" || raw.gradeMode === "preferred") patch.gradeMode = raw.gradeMode;

  const brands = strings(raw.brands, 6);
  if (brands) patch.brands = [...new Set(brands.map(canonicalBrand))];

  const categories = strings(raw.categories);
  if (categories) patch.categories = CATEGORIES.filter((c) => categories.includes(c));
  const aesthetics = strings(raw.aesthetics);
  if (aesthetics) patch.aesthetics = AESTHETICS.filter((a) => aesthetics.map((s) => s.toLowerCase()).includes(a));

  return Object.keys(patch).length > 0 ? patch : null;
}

export function applyRfqPatch(base: Rfq, patch: RfqPatch, source: Rfq["source"]): Rfq {
  const gradeLetters = patch.gradeLetters ?? base.gradeLetters;
  return {
    ...base,
    categories: patch.categories?.length ? patch.categories : base.categories,
    aesthetics: patch.aesthetics?.length ? patch.aesthetics : base.aesthetics,
    pieceRange: patch.pieceRange ?? base.pieceRange,
    maxPricePerPiece:
      patch.maxPricePerPiece === undefined ? base.maxPricePerPiece : (patch.maxPricePerPiece ?? undefined),
    budget: patch.budget === undefined ? base.budget : (patch.budget ?? undefined),
    gradeLetters,
    grades: gradeLetters.length === LETTERS.length ? [] : lettersToGrades(gradeLetters),
    gradeMode: patch.gradeMode ?? base.gradeMode,
    brands: patch.brands ?? base.brands,
    source
  };
}

/** A model that leaves a field empty has no opinion on it, so the deterministic value stays. */
function withoutGaps(patch: RfqPatch | null): RfqPatch | null {
  if (!patch) return null;
  const kept = Object.fromEntries(
    Object.entries(patch).filter(
      ([, v]) => v !== null && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
    )
  ) as RfqPatch;
  return Object.keys(kept).length > 0 ? kept : null;
}

export interface ResolveRfqOptions {
  /** Structured edit from the RFQ form. Wins over every parser. */
  override?: unknown;
  /** Optional model parse. Must resolve to raw JSON or null. */
  llmParse?: (brief: string, draft: Rfq) => Promise<unknown>;
}

export async function resolveRfq(dna: StoreDNA, opts: ResolveRfqOptions = {}): Promise<Rfq> {
  let rfq = parseRfq(dna);
  if (opts.llmParse) {
    const patch = withoutGaps(sanitizeRfqPatch(await opts.llmParse(dna.brief, rfq).catch(() => null)));
    if (patch) rfq = applyRfqPatch(rfq, patch, "llm");
  }
  const override = sanitizeRfqPatch(opts.override);
  return override ? applyRfqPatch(rfq, override, "edited") : rfq;
}
