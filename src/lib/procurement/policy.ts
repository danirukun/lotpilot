import type { Grade, WholesaleLot } from "@/lib/types";
import type { Supplier } from "@/data/suppliers";
import type {
  BuyingPolicy,
  PolicyEvaluation,
  PolicyStatus,
  RuleResult,
  SupplierScorecard
} from "@/lib/procurement/types";
import { gbp, gbp2 } from "@/lib/format";

export const DEFAULT_POLICY: BuyingPolicy = {
  minLotPrice: 300,
  maxLotPrice: 1000,
  maxPricePerPiece: 40,
  minGrade: "AB",
  minLandedRoiPct: 40,
  minSellThrough: 0.7,
  minSupplierScore: 75,
  maxBudgetSharePct: 50,
  maxSupplierSharePct: 60,
  maxLotsPerCategory: 2,
  maxPriceIndex: 1.05,
  targetDiscountPct: 12,
  maxRounds: 4,
  allowEarlyPayment: true,
  allowBundling: true,
  autoNegotiate: true
};

const GRADE_RANK: Record<Grade, number> = { A: 3, AB: 2, B: 1, Mixed: 0 };

/** Merge untrusted client input onto the defaults, keeping only known, typed fields. */
export function sanitizePolicy(input: unknown): BuyingPolicy {
  if (!input || typeof input !== "object") return DEFAULT_POLICY;
  const raw = input as Record<string, unknown>;
  const num = (key: keyof BuyingPolicy, min: number, max: number) => {
    const v = Number(raw[key]);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : (DEFAULT_POLICY[key] as number);
  };
  const bool = (key: keyof BuyingPolicy) =>
    typeof raw[key] === "boolean" ? (raw[key] as boolean) : (DEFAULT_POLICY[key] as boolean);
  const grade = (["A", "AB", "B", "Mixed"] as Grade[]).includes(raw.minGrade as Grade)
    ? (raw.minGrade as Grade)
    : DEFAULT_POLICY.minGrade;

  return {
    minLotPrice: num("minLotPrice", 0, 100_000),
    maxLotPrice: num("maxLotPrice", 0, 100_000),
    maxPricePerPiece: num("maxPricePerPiece", 1, 1_000),
    minGrade: grade,
    minLandedRoiPct: num("minLandedRoiPct", 0, 500),
    minSellThrough: num("minSellThrough", 0, 1),
    minSupplierScore: num("minSupplierScore", 0, 100),
    maxBudgetSharePct: num("maxBudgetSharePct", 1, 100),
    maxSupplierSharePct: num("maxSupplierSharePct", 1, 100),
    maxLotsPerCategory: num("maxLotsPerCategory", 1, 10),
    maxPriceIndex: num("maxPriceIndex", 0.5, 3),
    targetDiscountPct: num("targetDiscountPct", 0, 50),
    maxRounds: Math.round(num("maxRounds", 1, 8)),
    allowEarlyPayment: bool("allowEarlyPayment"),
    allowBundling: bool("allowBundling"),
    autoNegotiate: bool("autoNegotiate")
  };
}

/** 0..100 weighted supplier scorecard. */
export function scoreSupplier(s: Supplier): SupplierScorecard {
  const leadScore = Math.max(0, 1 - (s.leadTimeDays - 1) / 6);
  const score =
    (s.rating / 5) * 25 +
    s.onTimeRate * 25 +
    s.gradeAccuracy * 30 +
    Math.max(0, 1 - s.disputeRate * 10) * 10 +
    leadScore * 10;
  return {
    name: s.name,
    city: s.city,
    tier: s.tier,
    score: Math.round(score),
    rating: s.rating,
    onTimeRate: s.onTimeRate,
    gradeAccuracy: s.gradeAccuracy,
    disputeRate: s.disputeRate,
    leadTimeDays: s.leadTimeDays,
    yearsOnFleek: s.yearsOnFleek
  };
}

/** Deepest discount the supplier can give with the levers the policy allows. */
export function leverDiscountPct(
  supplier: Supplier,
  policy: BuyingPolicy,
  lotsFromSupplier: number
): number {
  const early = policy.allowEarlyPayment ? supplier.earlyPaymentDiscountPct : 0;
  const volume = policy.allowBundling ? volumeDiscountPct(supplier, lotsFromSupplier) : 0;
  return early + volume;
}

export function volumeDiscountPct(supplier: Supplier, lotsFromSupplier: number): number {
  return supplier.volumeTiers
    .filter((t) => lotsFromSupplier >= t.minLots)
    .reduce((best, t) => Math.max(best, t.discountPct), 0);
}

export interface PriceContext {
  lot: WholesaleLot;
  supplier: Supplier;
  scorecard: SupplierScorecard;
  budget: number;
  marketPricePerPiece: number;
  /** Revenue after expected grade-accuracy loss. */
  adjustedRevenue: number;
  lotsFromSupplier: number;
}

/** Highest lot price that satisfies every price-dependent rule. */
export function maxAcceptablePrice(ctx: PriceContext, policy: BuyingPolicy): number {
  const { lot, supplier, budget, marketPricePerPiece, adjustedRevenue } = ctx;
  const roiCap = adjustedRevenue / (1 + policy.minLandedRoiPct / 100) - supplier.shippingPerLot;
  return Math.floor(
    Math.min(
      policy.maxLotPrice,
      policy.maxPricePerPiece * lot.pieceCount,
      marketPricePerPiece * lot.pieceCount * policy.maxPriceIndex,
      (budget * policy.maxBudgetSharePct) / 100,
      roiCap
    )
  );
}

export function evaluatePolicy(ctx: PriceContext, policy: BuyingPolicy): PolicyEvaluation {
  const { lot, supplier, scorecard, budget, marketPricePerPiece, adjustedRevenue } = ctx;
  const list = lot.wholesalePrice;
  const flexFloor = list * (1 - supplier.negotiationFlex);
  const bestReachablePrice = Math.round(
    flexFloor * (1 - leverDiscountPct(supplier, policy, ctx.lotsFromSupplier) / 100)
  );
  const cap = maxAcceptablePrice(ctx, policy);

  const priceRule = (id: string, label: string, limit: number, detail: string): RuleResult => ({
    id,
    label,
    status: list <= limit ? "pass" : bestReachablePrice <= limit ? "negotiable" : "fail",
    detail
  });

  const pricePerPiece = list / lot.pieceCount;
  const priceIndex = pricePerPiece / marketPricePerPiece;
  const listLandedRoi =
    ((adjustedRevenue - list - supplier.shippingPerLot) / (list + supplier.shippingPerLot)) * 100;
  const budgetCap = (budget * policy.maxBudgetSharePct) / 100;

  const rules: RuleResult[] = [
    {
      id: "min-lot-price",
      label: "Minimum lot size",
      status: list >= policy.minLotPrice ? "pass" : "fail",
      detail: `${gbp(list)} vs ${gbp(policy.minLotPrice)} minimum`
    },
    priceRule(
      "max-lot-price",
      "Max price per lot",
      policy.maxLotPrice,
      `${gbp(list)} list vs ${gbp(policy.maxLotPrice)} cap`
    ),
    priceRule(
      "max-price-per-piece",
      "Max price per piece",
      policy.maxPricePerPiece * lot.pieceCount,
      `${gbp2(pricePerPiece)}/pc vs ${gbp2(policy.maxPricePerPiece)}/pc cap`
    ),
    priceRule(
      "market-index",
      "Price vs market",
      marketPricePerPiece * lot.pieceCount * policy.maxPriceIndex,
      `${Math.round((priceIndex - 1) * 100)}% vs 90-day market (cap +${Math.round(
        (policy.maxPriceIndex - 1) * 100
      )}%)`
    ),
    priceRule(
      "budget-share",
      "Budget concentration",
      budgetCap,
      `${Math.round((list / budget) * 100)}% of budget vs ${policy.maxBudgetSharePct}% cap`
    ),
    priceRule(
      "landed-roi",
      "Landed ROI floor",
      adjustedRevenue / (1 + policy.minLandedRoiPct / 100) - supplier.shippingPerLot,
      `${Math.round(listLandedRoi)}% at list vs ${policy.minLandedRoiPct}% floor`
    ),
    {
      id: "min-grade",
      label: "Quality grade",
      status: GRADE_RANK[lot.grade] >= GRADE_RANK[policy.minGrade] ? "pass" : "fail",
      detail: `Grade ${lot.grade} vs Grade ${policy.minGrade} minimum`
    },
    {
      id: "sell-through",
      label: "Sell-through",
      status: lot.sellThrough >= policy.minSellThrough ? "pass" : "fail",
      detail: `${Math.round(lot.sellThrough * 100)}% vs ${Math.round(
        policy.minSellThrough * 100
      )}% minimum`
    },
    {
      id: "supplier-score",
      label: "Supplier scorecard",
      status: scorecard.score >= policy.minSupplierScore ? "pass" : "fail",
      detail: `${scorecard.score}/100 vs ${policy.minSupplierScore} minimum`
    }
  ];

  const status: PolicyStatus = rules.some((r) => r.status === "fail")
    ? "blocked"
    : rules.some((r) => r.status === "negotiable")
      ? "negotiate"
      : "compliant";

  return { status, rules, maxAcceptablePrice: cap, bestReachablePrice };
}
