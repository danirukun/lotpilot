import type { Supplier } from "@/data/suppliers";

export interface SupplierMetrics {
  /** On-time dispatch and delivery, 0..100. */
  reliability: number;
  /** Share of pieces received at the declared grade, 0..100. */
  gradeConsistency: number;
  /** Share of ordered pieces actually delivered, 0..100. */
  fillRate: number;
  /** Returns plus QC disputes as a share of orders, percent. Lower is better. */
  qcReturnRisk: number;
  /** Wholesale orders the metrics are measured over (trailing 12 months). */
  ordersTracked: number;
}

/** Trailing-12-month fulfilment metrics per wholesaler, keyed by supplier name. */
export const SUPPLIER_METRICS: Record<string, SupplierMetrics> = {
  "Rewind Bales (Manchester)": {
    reliability: 93,
    gradeConsistency: 91,
    fillRate: 96,
    qcReturnRisk: 3.5,
    ordersTracked: 412
  },
  "Blue Loop Vintage (Leeds)": {
    reliability: 97,
    gradeConsistency: 96,
    fillRate: 98,
    qcReturnRisk: 1.6,
    ordersTracked: 638
  },
  "Crosstown Kilo (London)": {
    reliability: 86,
    gradeConsistency: 83,
    fillRate: 90,
    qcReturnRisk: 7.8,
    ordersTracked: 297
  },
  "Highland Thread (Glasgow)": {
    reliability: 93,
    gradeConsistency: 97,
    fillRate: 97,
    qcReturnRisk: 1.4,
    ordersTracked: 521
  },
  "Petal & Past (Bristol)": {
    reliability: 90,
    gradeConsistency: 89,
    fillRate: 94,
    qcReturnRisk: 4.6,
    ordersTracked: 236
  },
  "Sole Salvage (Birmingham)": {
    reliability: 84,
    gradeConsistency: 81,
    fillRate: 88,
    qcReturnRisk: 9.2,
    ordersTracked: 184
  },
  "Ivy League Imports (London)": {
    reliability: 93,
    gradeConsistency: 94,
    fillRate: 95,
    qcReturnRisk: 2.8,
    ordersTracked: 355
  },
  "Northern Grade Co. (Sheffield)": {
    reliability: 89,
    gradeConsistency: 87,
    fillRate: 92,
    qcReturnRisk: 5.9,
    ordersTracked: 309
  },
  "Atelier Resale (London)": {
    reliability: 96,
    gradeConsistency: 95,
    fillRate: 97,
    qcReturnRisk: 2.4,
    ordersTracked: 448
  },
  "Terrace Archive (Manchester)": {
    reliability: 92,
    gradeConsistency: 94,
    fillRate: 95,
    qcReturnRisk: 2.9,
    ordersTracked: 276
  },
  "Digbeth Devices (Birmingham)": {
    reliability: 92,
    gradeConsistency: 92,
    fillRate: 95,
    qcReturnRisk: 3.2,
    ordersTracked: 318
  },
  "Circuit Surplus (Birmingham)": {
    reliability: 87,
    gradeConsistency: 86,
    fillRate: 90,
    qcReturnRisk: 6.5,
    ordersTracked: 198
  },
  "TechCycle Wholesale (London)": {
    reliability: 95,
    gradeConsistency: 94,
    fillRate: 97,
    qcReturnRisk: 2.1,
    ordersTracked: 402
  }
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Seeded metrics, or an estimate from the marketplace fields for suppliers without a seed entry. */
export function supplierMetricsFor(s: Supplier): SupplierMetrics {
  return (
    SUPPLIER_METRICS[s.name] ?? {
      reliability: Math.round(s.onTimeRate * 100 - (s.leadTimeDays > 3 ? 2 : 0)),
      gradeConsistency: Math.round(s.gradeAccuracy * 100 - 1),
      fillRate: Math.round(100 - (1 - s.onTimeRate) * 60 - s.disputeRate * 50),
      qcReturnRisk: round1(s.disputeRate * 150 + (1 - s.gradeAccuracy) * 10),
      ordersTracked: Math.round(s.yearsOnFleek * 70)
    }
  );
}
