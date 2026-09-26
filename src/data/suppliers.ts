export type SupplierTier = "Strategic" | "Preferred" | "Approved";

export interface VolumeTier {
  /** Minimum number of lots bought from this supplier in one order. */
  minLots: number;
  discountPct: number;
}

export interface Supplier {
  name: string;
  city: string;
  tier: SupplierTier;
  /** Marketplace rating, 0..5. */
  rating: number;
  onTimeRate: number;
  /** Share of pieces that arrive at the declared grade. */
  gradeAccuracy: number;
  disputeRate: number;
  leadTimeDays: number;
  yearsOnFleek: number;
  /** Largest discount off list the supplier will give on price alone. Hidden from the buyer. */
  negotiationFlex: number;
  earlyPaymentDiscountPct: number;
  volumeTiers: VolumeTier[];
  shippingPerLot: number;
}

export const SUPPLIERS: Supplier[] = [
  {
    name: "Rewind Bales (Manchester)",
    city: "Manchester",
    tier: "Preferred",
    rating: 4.6,
    onTimeRate: 0.94,
    gradeAccuracy: 0.92,
    disputeRate: 0.02,
    leadTimeDays: 3,
    yearsOnFleek: 4,
    negotiationFlex: 0.1,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [
      { minLots: 2, discountPct: 3 },
      { minLots: 3, discountPct: 5 }
    ],
    shippingPerLot: 18
  },
  {
    name: "Blue Loop Vintage (Leeds)",
    city: "Leeds",
    tier: "Strategic",
    rating: 4.8,
    onTimeRate: 0.97,
    gradeAccuracy: 0.96,
    disputeRate: 0.01,
    leadTimeDays: 2,
    yearsOnFleek: 6,
    negotiationFlex: 0.06,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [{ minLots: 2, discountPct: 4 }],
    shippingPerLot: 16
  },
  {
    name: "Crosstown Kilo (London)",
    city: "London",
    tier: "Approved",
    rating: 4.2,
    onTimeRate: 0.88,
    gradeAccuracy: 0.85,
    disputeRate: 0.05,
    leadTimeDays: 2,
    yearsOnFleek: 3,
    negotiationFlex: 0.14,
    earlyPaymentDiscountPct: 3,
    volumeTiers: [
      { minLots: 2, discountPct: 5 },
      { minLots: 3, discountPct: 8 }
    ],
    shippingPerLot: 12
  },
  {
    name: "Highland Thread (Glasgow)",
    city: "Glasgow",
    tier: "Strategic",
    rating: 4.7,
    onTimeRate: 0.95,
    gradeAccuracy: 0.97,
    disputeRate: 0.01,
    leadTimeDays: 4,
    yearsOnFleek: 7,
    negotiationFlex: 0.05,
    earlyPaymentDiscountPct: 1.5,
    volumeTiers: [{ minLots: 2, discountPct: 3 }],
    shippingPerLot: 24
  },
  {
    name: "Petal & Past (Bristol)",
    city: "Bristol",
    tier: "Preferred",
    rating: 4.4,
    onTimeRate: 0.91,
    gradeAccuracy: 0.9,
    disputeRate: 0.03,
    leadTimeDays: 3,
    yearsOnFleek: 3,
    negotiationFlex: 0.12,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [{ minLots: 2, discountPct: 4 }],
    shippingPerLot: 18
  },
  {
    name: "Sole Salvage (Birmingham)",
    city: "Birmingham",
    tier: "Approved",
    rating: 4.1,
    onTimeRate: 0.86,
    gradeAccuracy: 0.83,
    disputeRate: 0.06,
    leadTimeDays: 3,
    yearsOnFleek: 2,
    negotiationFlex: 0.15,
    earlyPaymentDiscountPct: 3,
    volumeTiers: [{ minLots: 2, discountPct: 5 }],
    shippingPerLot: 20
  },
  {
    name: "Ivy League Imports (London)",
    city: "London",
    tier: "Preferred",
    rating: 4.5,
    onTimeRate: 0.93,
    gradeAccuracy: 0.94,
    disputeRate: 0.02,
    leadTimeDays: 2,
    yearsOnFleek: 5,
    negotiationFlex: 0.08,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [{ minLots: 2, discountPct: 3 }],
    shippingPerLot: 12
  },
  {
    name: "Northern Grade Co. (Sheffield)",
    city: "Sheffield",
    tier: "Approved",
    rating: 4.3,
    onTimeRate: 0.9,
    gradeAccuracy: 0.88,
    disputeRate: 0.04,
    leadTimeDays: 3,
    yearsOnFleek: 4,
    negotiationFlex: 0.11,
    earlyPaymentDiscountPct: 2.5,
    volumeTiers: [
      { minLots: 2, discountPct: 4 },
      { minLots: 3, discountPct: 6 }
    ],
    shippingPerLot: 18
  },
  {
    name: "Atelier Resale (London)",
    city: "London",
    tier: "Preferred",
    rating: 4.6,
    onTimeRate: 0.96,
    gradeAccuracy: 0.95,
    disputeRate: 0.02,
    leadTimeDays: 2,
    yearsOnFleek: 5,
    negotiationFlex: 0.07,
    earlyPaymentDiscountPct: 1.5,
    volumeTiers: [{ minLots: 2, discountPct: 3 }],
    shippingPerLot: 12
  },
  {
    name: "Terrace Archive (Manchester)",
    city: "Manchester",
    tier: "Preferred",
    rating: 4.6,
    onTimeRate: 0.93,
    gradeAccuracy: 0.94,
    disputeRate: 0.02,
    leadTimeDays: 3,
    yearsOnFleek: 4,
    negotiationFlex: 0.09,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [
      { minLots: 2, discountPct: 3 },
      { minLots: 3, discountPct: 5 }
    ],
    shippingPerLot: 16
  },
  {
    name: "Digbeth Devices (Birmingham)",
    city: "Birmingham",
    tier: "Preferred",
    rating: 4.5,
    onTimeRate: 0.94,
    gradeAccuracy: 0.93,
    disputeRate: 0.025,
    leadTimeDays: 2,
    yearsOnFleek: 5,
    negotiationFlex: 0.09,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [
      { minLots: 2, discountPct: 4 },
      { minLots: 3, discountPct: 6 }
    ],
    shippingPerLot: 14
  },
  {
    name: "Circuit Surplus (Birmingham)",
    city: "Birmingham",
    tier: "Approved",
    rating: 4.2,
    onTimeRate: 0.89,
    gradeAccuracy: 0.87,
    disputeRate: 0.045,
    leadTimeDays: 3,
    yearsOnFleek: 3,
    negotiationFlex: 0.12,
    earlyPaymentDiscountPct: 2.5,
    volumeTiers: [{ minLots: 2, discountPct: 5 }],
    shippingPerLot: 16
  },
  {
    name: "TechCycle Wholesale (London)",
    city: "London",
    tier: "Strategic",
    rating: 4.7,
    onTimeRate: 0.96,
    gradeAccuracy: 0.95,
    disputeRate: 0.018,
    leadTimeDays: 2,
    yearsOnFleek: 6,
    negotiationFlex: 0.07,
    earlyPaymentDiscountPct: 2,
    volumeTiers: [{ minLots: 2, discountPct: 3 }],
    shippingPerLot: 18
  }
];

export const supplierByName = (name: string): Supplier =>
  SUPPLIERS.find((s) => s.name === name) ?? SUPPLIERS[0];
