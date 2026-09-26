import { BENCHMARKS } from "@/data/benchmarks";
import { supplierByName } from "@/data/suppliers";
import { evaluatePolicy, scoreSupplier } from "@/lib/procurement/policy";
import { adjustedRevenueFor, marketPricePerPiece, negotiate } from "@/lib/procurement/negotiation";
import type {
  BuyingPolicy,
  Exclusion,
  PlanLine,
  ProcuredLot,
  ProcurementMetrics,
  SourcingPlan
} from "@/lib/procurement/types";
import type { LotScore } from "@/lib/types";
import { KEY_SUPPLIER_BOOST, withPurchaseHistory } from "@/lib/procurement/keySuppliers";
import type { RfqMatch } from "@/lib/rfq/types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/** Attach supplier scorecard, TCO metrics, risk and policy verdict to a ranked lot. */
export function procureLot(
  match: LotScore,
  policy: BuyingPolicy,
  budget: number,
  lotsFromSupplier = 1,
  extras: { rfq?: RfqMatch; personaId?: string } = {}
): ProcuredLot {
  const { lot } = match;
  const supplier = supplierByName(lot.wholesaler);
  const scorecard = withPurchaseHistory(scoreSupplier(supplier), extras.personaId);
  const market = marketPricePerPiece(lot);
  const adjustedRevenue = adjustedRevenueFor(lot);
  const priceIndex = lot.wholesalePrice / lot.pieceCount / market;

  const landedCost = lot.wholesalePrice + supplier.shippingPerLot;
  const landedProfit = adjustedRevenue - landedCost;

  const risk = clamp(
    Math.min(40, (1 - supplier.gradeAccuracy) * 200) +
      (lot.grade === "B" || lot.grade === "Mixed" ? 15 : 0) +
      Math.min(25, Math.max(0, priceIndex - 1) * 100) +
      Math.min(15, supplier.disputeRate * 300) +
      (supplier.leadTimeDays > 3 ? 5 : 0) +
      (lot.sellThrough < 0.75 ? 5 : 0)
  );

  const policyEval = evaluatePolicy(
    {
      lot,
      supplier,
      scorecard,
      budget,
      marketPricePerPiece: market,
      adjustedRevenue,
      lotsFromSupplier
    },
    policy
  );

  const valueScore = clamp(100 - (priceIndex - 0.85) * 250);
  const relevance = extras.rfq?.relevance ?? match.score;
  const rawDecision = clamp(
    0.45 * relevance +
      0.25 * scorecard.score +
      0.15 * valueScore +
      0.15 * (100 - risk) +
      (scorecard.keySupplier ? KEY_SUPPLIER_BOOST : 0)
  );
  const decisionScore = Math.round(
    policyEval.status === "blocked" ? Math.min(35, rawDecision) : rawDecision
  );

  const metrics: ProcurementMetrics = {
    marketPricePerPiece: market,
    comparables: BENCHMARKS[lot.id]?.comparables ?? 0,
    priceIndex: Math.round(priceIndex * 100) / 100,
    shipping: supplier.shippingPerLot,
    expectedQualityLoss: Math.round(match.economics.projectedRevenue - adjustedRevenue),
    landedCost,
    landedProfit: Math.round(landedProfit),
    landedRoiPct: Math.round((landedProfit / landedCost) * 100),
    riskScore: Math.round(risk),
    riskLevel: risk < 25 ? "low" : risk < 45 ? "medium" : "high",
    decisionScore
  };

  return {
    ...match,
    supplier: scorecard,
    metrics,
    policy: policyEval,
    ...(extras.rfq ? { rfq: extras.rfq } : {})
  };
}

/** Rank procured lots: policy-cleared first, then by decision score, then supplier score. */
export function rankProcured(lots: ProcuredLot[]): ProcuredLot[] {
  const order = { compliant: 0, negotiate: 0, blocked: 1 };
  return [...lots].sort(
    (a, b) =>
      order[a.policy.status] - order[b.policy.status] ||
      b.metrics.decisionScore - a.metrics.decisionScore ||
      b.supplier.score - a.supplier.score
  );
}

function firstFailure(p: ProcuredLot): string {
  const rule = p.policy.rules.find((r) => r.status === "fail");
  return rule ? `${rule.label}: ${rule.detail}` : "Blocked by policy";
}

/**
 * Strategic sourcing: greedily build an opening buy that maximises decision
 * score within budget, while respecting supplier-concentration and
 * category-diversification caps. Prices are post-negotiation estimates.
 */
export interface SourcingPlanOptions {
  maxLines?: number;
  minFit?: number;
  exploratory?: boolean;
}

export function buildSourcingPlan(
  candidates: ProcuredLot[],
  policy: BuyingPolicy,
  budget: number,
  budgetAssumed: boolean,
  opts: SourcingPlanOptions = {}
): SourcingPlan {
  const minFit = opts.minFit ?? 50;
  const maxLines = opts.maxLines ?? Infinity;
  const excluded: Exclusion[] = [];
  const chosen: ProcuredLot[] = [];
  const supplierSpend = new Map<string, number>();
  const supplierLots = new Map<string, number>();
  const categoryLots = new Map<string, number>();
  const supplierCap = (budget * policy.maxSupplierSharePct) / 100;
  let spend = 0;

  const exclude = (p: ProcuredLot, reason: string) =>
    excluded.push({ lotId: p.lot.id, title: p.lot.title, reason });

  for (const p of rankProcured(candidates)) {
    const { lot } = p;
    if (p.policy.status === "blocked") {
      exclude(p, firstFailure(p));
      continue;
    }
    if (p.rfq?.hardMiss) {
      exclude(p, `Outside your quote request: ${p.rfq.hardMiss.label.toLowerCase()} (${p.rfq.hardMiss.detail})`);
      continue;
    }
    const fit = p.rfq?.gate ?? p.score;
    if (fit < minFit) {
      exclude(p, `Weak store fit (${fit}/100)`);
      continue;
    }
    if (chosen.length >= maxLines) {
      exclude(p, "Exploratory plan capped at " + maxLines + " lots");
      continue;
    }
    if ((categoryLots.get(lot.category) ?? 0) >= policy.maxLotsPerCategory) {
      exclude(p, `Category cap: already ${policy.maxLotsPerCategory} ${lot.category} lots`);
      continue;
    }

    const lotsFromSupplier = (supplierLots.get(lot.wholesaler) ?? 0) + 1;
    const price = estimatePrice(p, policy, budget, lotsFromSupplier);
    if (price === null) {
      exclude(
        p,
        policy.autoNegotiate
          ? "Negotiation could not reach the policy ceiling"
          : "Over policy at list price (auto-negotiate is off)"
      );
      continue;
    }
    if (spend + price > budget) {
      exclude(p, `Over remaining budget (£${Math.round(budget - spend)} left)`);
      continue;
    }
    if ((supplierSpend.get(lot.wholesaler) ?? 0) + price > supplierCap) {
      exclude(p, `Supplier concentration cap (${policy.maxSupplierSharePct}% of budget)`);
      continue;
    }

    chosen.push(p);
    spend += price;
    supplierSpend.set(lot.wholesaler, (supplierSpend.get(lot.wholesaler) ?? 0) + price);
    supplierLots.set(lot.wholesaler, lotsFromSupplier);
    categoryLots.set(lot.category, (categoryLots.get(lot.category) ?? 0) + 1);
  }

  // Re-price with final basket counts so volume tiers apply to every lot from a supplier.
  const lines: PlanLine[] = chosen.map((p) => {
    const price =
      estimatePrice(p, policy, budget, supplierLots.get(p.lot.wholesaler) ?? 1) ??
      p.lot.wholesalePrice;
    return {
      lotId: p.lot.id,
      title: p.lot.title,
      wholesaler: p.lot.wholesaler,
      category: p.lot.category,
      listPrice: p.lot.wholesalePrice,
      estimatedPrice: price,
      landedProfit: Math.round(adjustedRevenueFor(p.lot) - price - p.metrics.shipping),
      decisionScore: p.metrics.decisionScore,
      supplierScore: p.supplier.score,
      keySupplier: Boolean(p.supplier.keySupplier),
      ...(p.rfq ? { rfqScore: p.rfq.score } : {})
    };
  });

  const totalList = sum(lines.map((l) => l.listPrice));
  const totalSpend = sum(lines.map((l) => l.estimatedPrice));
  const shipping = sum(chosen.map((p) => p.metrics.shipping));
  const expectedLandedProfit = sum(lines.map((l) => l.landedProfit));

  const mix = new Map<string, number>();
  lines.forEach((l) => mix.set(l.wholesaler, (mix.get(l.wholesaler) ?? 0) + l.estimatedPrice));
  const cats = new Map<string, number>();
  lines.forEach((l) => cats.set(l.category, (cats.get(l.category) ?? 0) + 1));

  return {
    budget,
    budgetAssumed,
    ...(opts.exploratory ? { exploratory: true } : {}),
    lines,
    totalList,
    totalSpend,
    estimatedSavings: totalList - totalSpend,
    budgetUtilizationPct: Math.round((totalSpend / budget) * 100),
    expectedLandedProfit,
    blendedLandedRoiPct:
      totalSpend > 0 ? Math.round((expectedLandedProfit / (totalSpend + shipping)) * 100) : 0,
    avgSupplierScore: chosen.length
      ? Math.round(sum(chosen.map((p) => p.supplier.score)) / chosen.length)
      : 0,
    supplierMix: [...mix.entries()].map(([name, s]) => ({
      name,
      spend: s,
      sharePct: Math.round((s / Math.max(1, totalSpend)) * 100)
    })),
    categoryMix: [...cats.entries()].map(([category, lots]) => ({ category, lots })),
    excluded: excluded.slice(0, 6)
  };
}

function estimatePrice(
  p: ProcuredLot,
  policy: BuyingPolicy,
  budget: number,
  lotsFromSupplier: number
): number | null {
  if (!policy.autoNegotiate) {
    return p.policy.status === "compliant" ? p.lot.wholesalePrice : null;
  }
  return negotiate(p.lot, policy, { budget, lotsFromSupplier }).finalPrice;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
