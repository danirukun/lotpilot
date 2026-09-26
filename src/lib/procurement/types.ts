import type { Grade, LotScore } from "@/lib/types";
import type { SupplierTier } from "@/data/suppliers";

export interface BuyingPolicy {
  minLotPrice: number;
  maxLotPrice: number;
  maxPricePerPiece: number;
  minGrade: Grade;
  /** Minimum landed (total-cost-of-ownership) ROI, percent. */
  minLandedRoiPct: number;
  /** 0..1 */
  minSellThrough: number;
  minSupplierScore: number;
  /** Cap on a single lot as a share of budget, percent. */
  maxBudgetSharePct: number;
  /** Cap on spend with one supplier as a share of budget, percent. */
  maxSupplierSharePct: number;
  maxLotsPerCategory: number;
  /** Most we pay versus the 90-day market benchmark, e.g. 1.05 = +5%. */
  maxPriceIndex: number;
  /** Opening ask below list, percent. */
  targetDiscountPct: number;
  maxRounds: number;
  allowEarlyPayment: boolean;
  allowBundling: boolean;
  autoNegotiate: boolean;
}

export type RuleStatus = "pass" | "negotiable" | "fail";

export interface RuleResult {
  id: string;
  label: string;
  status: RuleStatus;
  detail: string;
}

export type PolicyStatus = "compliant" | "negotiate" | "blocked";

export interface PolicyEvaluation {
  status: PolicyStatus;
  rules: RuleResult[];
  /** Highest price that satisfies every price rule. */
  maxAcceptablePrice: number;
  /** Lowest price the supplier can reach with every allowed lever. */
  bestReachablePrice: number;
}

export interface SupplierScorecard {
  name: string;
  city: string;
  tier: SupplierTier;
  score: number;
  rating: number;
  onTimeRate: number;
  gradeAccuracy: number;
  disputeRate: number;
  leadTimeDays: number;
  yearsOnFleek: number;
}

export interface ProcurementMetrics {
  marketPricePerPiece: number;
  comparables: number;
  /** Price per piece / market price per piece. */
  priceIndex: number;
  shipping: number;
  expectedQualityLoss: number;
  landedCost: number;
  landedProfit: number;
  landedRoiPct: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  /** Weighted blend of fit, supplier, value and risk, 0..100. */
  decisionScore: number;
}

export interface ProcuredLot extends LotScore {
  supplier: SupplierScorecard;
  metrics: ProcurementMetrics;
  policy: PolicyEvaluation;
}

export type Party = "buyer" | "supplier";

export interface NegotiationRound {
  round: number;
  party: Party;
  amount: number;
  message: string;
  levers: string[];
}

export type NegotiationStatus = "agreed" | "walked-away";

export interface NegotiationResult {
  lotId: string;
  lotTitle: string;
  wholesaler: string;
  listPrice: number;
  openingOffer: number;
  walkAwayPrice: number;
  finalPrice: number | null;
  status: NegotiationStatus;
  savings: number;
  savingsPct: number;
  rounds: NegotiationRound[];
  leversUsed: string[];
  summary: string;
}

export interface PlanLine {
  lotId: string;
  title: string;
  wholesaler: string;
  category: string;
  listPrice: number;
  estimatedPrice: number;
  landedProfit: number;
  decisionScore: number;
}

export interface Exclusion {
  lotId: string;
  title: string;
  reason: string;
}

export interface SourcingPlan {
  budget: number;
  budgetAssumed: boolean;
  lines: PlanLine[];
  totalList: number;
  totalSpend: number;
  estimatedSavings: number;
  budgetUtilizationPct: number;
  expectedLandedProfit: number;
  blendedLandedRoiPct: number;
  avgSupplierScore: number;
  supplierMix: { name: string; spend: number; sharePct: number }[];
  categoryMix: { category: string; lots: number }[];
  excluded: Exclusion[];
}
