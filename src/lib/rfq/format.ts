import { gbp, gbp2 } from "@/lib/format";
import type { Category } from "@/lib/types";
import type { Rfq, RfqGradeLetter } from "@/lib/rfq/types";

const AESTHETIC: Record<string, string> = {
  y2k: "Y2K",
  minimal: "quiet-luxury",
  office: "smart",
  custom: "customised"
};

const CATEGORY_NOUN: Record<Category, string> = {
  denim: "denim",
  outerwear: "outerwear",
  knitwear: "knitwear",
  "tees-tops": "tops",
  dresses: "dresses",
  sportswear: "sportswear",
  accessories: "accessories",
  footwear: "footwear"
};

export const aestheticLabel = (a: string) => AESTHETIC[a] ?? a;
export const categoryLabel = (c: Category) => CATEGORY_NOUN[c] ?? c;
export const gradeLabel = (letters: RfqGradeLetter[]) => letters.join("/");

export function pieceRangeLabel({ min, max }: Rfq["pieceRange"]): string {
  if (min !== undefined && max !== undefined) return `${min}–${max} pcs`;
  if (min !== undefined) return `${min}+ pcs`;
  if (max !== undefined) return `up to ${max} pcs`;
  return "any size";
}

export function budgetLabel(n: number): string {
  return n >= 1000 && n % 100 === 0 ? `£${n / 1000}k` : gbp(n);
}

const list = (xs: string[], sep: string, cap: number, more = "") =>
  xs.length > cap ? `${xs.slice(0, cap).join(sep)}${more}` : xs.join(sep);

/** One-line RFQ, e.g. "80–120 Y2K tops, grade A/B, ≤£12/pc, budget £2k". */
export function rfqSummaryLine(rfq: Rfq): string {
  const { min, max } = rfq.pieceRange;
  const qty =
    min !== undefined && max !== undefined
      ? `${min}–${max}`
      : min !== undefined
        ? `${min}+`
        : max !== undefined
          ? `up to ${max}`
          : "";
  const nouns = new Set(rfq.categories.map(categoryLabel));
  const style = list(rfq.aesthetics.map(aestheticLabel).filter((a) => !nouns.has(a)), " ", 2);
  const brands = rfq.brands.length ? list(rfq.brands, " / ", 3) : "";
  const noun = rfq.categories.length ? list(rfq.categories.map(categoryLabel), " & ", 2, " & more") : "lots";
  const head = [qty, style, brands, noun].filter(Boolean).join(" ");
  const parts = [head];
  if (rfq.grades.length) {
    parts.push(`grade ${gradeLabel(rfq.gradeLetters)}${rfq.gradeMode === "preferred" ? " preferred" : ""}`);
  }
  if (rfq.maxPricePerPiece !== undefined) parts.push(`≤${gbp2(rfq.maxPricePerPiece).replace(".00", "")}/pc`);
  if (rfq.budget !== undefined) parts.push(`budget ${budgetLabel(rfq.budget)}`);
  return parts.join(", ");
}

export interface RfqChip {
  id: string;
  label: string;
  value: string;
  set: boolean;
}

export function rfqChips(rfq: Rfq): RfqChip[] {
  const hasPieces = rfq.pieceRange.min !== undefined || rfq.pieceRange.max !== undefined;
  return [
    {
      id: "style",
      label: "Style",
      value:
        [...rfq.aesthetics.map(aestheticLabel), ...rfq.categories.map(categoryLabel)].join(" · ") || "Any",
      set: rfq.aesthetics.length + rfq.categories.length > 0
    },
    { id: "pieces", label: "Pieces", value: hasPieces ? pieceRangeLabel(rfq.pieceRange) : "Any", set: hasPieces },
    {
      id: "price",
      label: "Max £/pc",
      value: rfq.maxPricePerPiece !== undefined ? gbp2(rfq.maxPricePerPiece) : "Any",
      set: rfq.maxPricePerPiece !== undefined
    },
    {
      id: "budget",
      label: "Budget",
      value: rfq.budget !== undefined ? gbp(rfq.budget) : "Not set",
      set: rfq.budget !== undefined
    },
    {
      id: "grade",
      label: "Grade",
      value: rfq.grades.length
        ? `${gradeLabel(rfq.gradeLetters)} (${rfq.grades.join(", ")})${rfq.gradeMode === "preferred" ? " · preferred" : ""}`
        : "Any",
      set: rfq.grades.length > 0
    },
    { id: "brands", label: "Brands", value: rfq.brands.join(", ") || "Any", set: rfq.brands.length > 0 }
  ];
}
