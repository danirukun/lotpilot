import { supplierByName } from "@/data/suppliers";
import { gbp, gbp2 } from "@/lib/format";
import { leverDiscountPct } from "@/lib/procurement/policy";
import type { BuyingPolicy } from "@/lib/procurement/types";
import type { Grade, LotScore, WholesaleLot } from "@/lib/types";
import { aestheticLabel, categoryLabel, gradeLabel, pieceRangeLabel } from "@/lib/rfq/format";
import type { Rfq, RfqCheck, RfqCheckStatus, RfqMatch } from "@/lib/rfq/types";

export const RFQ_WEIGHTS: Record<RfqCheck["id"], number> = {
  style: 30,
  price: 25,
  pieces: 20,
  grade: 20,
  brands: 15,
  budget: 10
};

const GRADE_ORDER: Grade[] = ["A", "AB", "B", "Mixed"];

const statusOf = (sat: number): RfqCheckStatus => (sat >= 0.999 ? "met" : sat > 0 ? "partial" : "missed");

const check = (
  id: RfqCheck["id"],
  label: string,
  satisfaction: number,
  detail: string,
  hard = false
): RfqCheck => ({ id, label, satisfaction, status: statusOf(satisfaction), detail, hard });

/** Constraints the retailer stated beyond style and budget. */
export function explicitConstraintCount(rfq: Rfq): number {
  return [
    rfq.pieceRange.min !== undefined || rfq.pieceRange.max !== undefined,
    rfq.maxPricePerPiece !== undefined,
    rfq.grades.length > 0,
    rfq.brands.length > 0
  ].filter(Boolean).length;
}

/** RFQ dominates the blend when the retailer gave explicit constraints; vibe dominates otherwise. */
export function rfqWeight(rfq: Rfq): number {
  const n = explicitConstraintCount(rfq);
  return n === 0 ? 0.25 : Math.min(0.8, 0.5 + 0.1 * n);
}

/** Lowest lot price the supplier can reach with the levers the policy allows. */
export function reachablePrice(lot: WholesaleLot, policy: BuyingPolicy): number {
  const supplier = supplierByName(lot.wholesaler);
  return Math.round(
    lot.wholesalePrice * (1 - supplier.negotiationFlex) * (1 - leverDiscountPct(supplier, policy, 1) / 100)
  );
}

export function scoreRfq(match: LotScore, rfq: Rfq, policy: BuyingPolicy): RfqMatch {
  const { lot } = match;
  const reach = reachablePrice(lot, policy);
  const checks = [
    styleCheck(lot, rfq),
    piecesCheck(lot, rfq),
    priceCheck(lot, rfq, reach),
    budgetCheck(lot, rfq, reach),
    gradeCheck(lot, rfq),
    brandsCheck(lot, rfq)
  ].filter((c): c is RfqCheck => c !== null);

  const totalWeight = checks.reduce((s, c) => s + RFQ_WEIGHTS[c.id], 0);
  const weighted = totalWeight
    ? checks.reduce((s, c) => s + RFQ_WEIGHTS[c.id] * c.satisfaction, 0) / totalWeight
    : 0.5;
  // An off-brief lot cannot win on price and size alone.
  const styleSat = checks.find((c) => c.id === "style")?.satisfaction ?? 1;
  const score = Math.round(100 * weighted * (0.3 + 0.7 * styleSat));
  const weight = rfqWeight(rfq);
  const relevance = Math.round(weight * score + (1 - weight) * match.score);
  const onCategory = rfq.categories.length === 0 || rfq.categories.includes(lot.category);

  return {
    score,
    checks,
    weight,
    relevance,
    gate:
      explicitConstraintCount(rfq) >= 2 && styleSat > 0 && onCategory
        ? Math.max(score, relevance)
        : relevance,
    hardMiss: checks.find((c) => c.hard && c.status === "missed")
  };
}

function styleCheck(lot: WholesaleLot, rfq: Rfq): RfqCheck | null {
  if (rfq.categories.length === 0 && rfq.aesthetics.length === 0) return null;
  const hits: string[] = [];
  const categoryHit = rfq.categories.includes(lot.category);
  if (categoryHit) hits.push(categoryLabel(lot.category));
  const matched = lot.aesthetics.filter((a) => rfq.aesthetics.includes(a));
  hits.push(...matched.map(aestheticLabel));
  const aestheticSat = Math.min(1, matched.length / Math.min(2, Math.max(1, rfq.aesthetics.length)));

  const sat =
    rfq.categories.length === 0
      ? aestheticSat
      : rfq.aesthetics.length === 0
        ? Number(categoryHit)
        : 0.5 * Number(categoryHit) + 0.5 * aestheticSat;
  const miss = rfq.categories.length > 0 && !categoryHit ? `; not ${rfq.categories.map(categoryLabel).join(" or ")}` : "";
  return check(
    "style",
    "Category & aesthetic",
    Math.round(sat * 100) / 100,
    hits.length ? `Matches ${hits.join(" · ")}${miss}` : `${categoryLabel(lot.category)} lot, off-brief`
  );
}

function piecesCheck(lot: WholesaleLot, rfq: Rfq): RfqCheck | null {
  const { min, max } = rfq.pieceRange;
  if (min === undefined && max === undefined) return null;
  const n = lot.pieceCount;
  const wanted = pieceRangeLabel(rfq.pieceRange);
  if (min !== undefined && n < min) {
    const sat = Math.max(0, 1 - (min - n) / min / 0.5);
    return check("pieces", "Piece count", round2(sat), `${n} pcs, ${min - n} short of ${wanted}`);
  }
  if (max !== undefined && n > max) {
    const sat = Math.max(0, 1 - (n - max) / max / 0.5);
    return check("pieces", "Piece count", round2(sat), `${n} pcs, ${n - max} over ${wanted}`);
  }
  return check("pieces", "Piece count", 1, `${n} pcs, inside ${wanted}`);
}

function priceCheck(lot: WholesaleLot, rfq: Rfq, reach: number): RfqCheck | null {
  const cap = rfq.maxPricePerPiece;
  if (cap === undefined) return null;
  const ppp = lot.wholesalePrice / lot.pieceCount;
  const reachPpp = reach / lot.pieceCount;
  const vs = `${gbp2(ppp)}/pc vs ${gbp2(cap)}/pc max`;
  if (ppp <= cap) return check("price", "Price per piece", 1, vs, true);
  if (reachPpp <= cap) {
    return check("price", "Price per piece", 0.65, `${vs}; negotiable to ~${gbp2(reachPpp)}/pc`, true);
  }
  if (ppp <= cap * 1.2) return check("price", "Price per piece", 0.25, `${vs}; just over`, true);
  return check("price", "Price per piece", 0, vs, true);
}

function budgetCheck(lot: WholesaleLot, rfq: Rfq, reach: number): RfqCheck | null {
  if (rfq.budget === undefined) return null;
  const list = lot.wholesalePrice;
  const vs = `${gbp(list)} vs ${gbp(rfq.budget)} budget`;
  if (list <= rfq.budget) return check("budget", "Within budget", 1, vs);
  if (reach <= rfq.budget) return check("budget", "Within budget", 0.6, `${vs}; fits after negotiation`);
  return check("budget", "Within budget", 0, vs);
}

function gradeCheck(lot: WholesaleLot, rfq: Rfq): RfqCheck | null {
  if (rfq.grades.length === 0) return null;
  const want = `grade ${gradeLabel(rfq.gradeLetters)}${rfq.gradeMode === "preferred" ? " preferred" : ""}`;
  if (rfq.grades.includes(lot.grade)) return check("grade", "Grade", 1, `Grade ${lot.grade} fits ${want}`);
  const idx = GRADE_ORDER.indexOf(lot.grade);
  const distance = Math.min(...rfq.grades.map((g) => Math.abs(GRADE_ORDER.indexOf(g) - idx)));
  const preferred = rfq.gradeMode === "preferred";
  const sat = distance === 1 ? (preferred ? 0.6 : 0.35) : preferred ? 0.2 : 0;
  return check("grade", "Grade", sat, `Grade ${lot.grade} vs ${want}`, !preferred);
}

function brandsCheck(lot: WholesaleLot, rfq: Rfq): RfqCheck | null {
  if (rfq.brands.length === 0) return null;
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const wanted = new Set(rfq.brands.map(key));
  const hits = lot.brands.filter((b) => wanted.has(key(b)));
  return hits.length
    ? check("brands", "Brand hints", 1, `Includes ${hits.join(", ")}`)
    : check("brands", "Brand hints", 0, `No ${rfq.brands.join(" / ")} in lot`);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
