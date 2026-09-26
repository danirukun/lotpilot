import { LOTS } from "@/data/lots";
import { supplierByName } from "@/data/suppliers";
import { evaluatePolicy, scoreSupplier } from "@/lib/procurement/policy";
import { adjustedRevenueFor, marketPricePerPiece, negotiate } from "@/lib/procurement/negotiation";
import type { BuyingPolicy, NegotiationResult } from "@/lib/procurement/types";
import type { Order, OrderLine, WholesaleLot } from "@/lib/types";

function orderId(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LP-${new Date().getFullYear()}-${rand}`;
}

export interface BasketDeal {
  lot: WholesaleLot;
  status: "ok" | "rejected";
  reason?: string;
  price: number;
  negotiation: NegotiationResult | null;
}

/**
 * Negotiate every lot in a basket against the policy. Volume tiers use the
 * number of lots per supplier in the basket.
 */
export function negotiateBasket(
  lotIds: string[],
  policy: BuyingPolicy,
  budget: number,
  forceNegotiate = false
): BasketDeal[] {
  const lots = lotIds
    .map((id) => LOTS.find((l) => l.id === id))
    .filter((l): l is WholesaleLot => Boolean(l));
  const perSupplier = new Map<string, number>();
  lots.forEach((l) => perSupplier.set(l.wholesaler, (perSupplier.get(l.wholesaler) ?? 0) + 1));

  return lots.map((lot) => {
    const supplier = supplierByName(lot.wholesaler);
    const lotsFromSupplier = perSupplier.get(lot.wholesaler) ?? 1;
    const evaluation = evaluatePolicy(
      {
        lot,
        supplier,
        scorecard: scoreSupplier(supplier),
        budget,
        marketPricePerPiece: marketPricePerPiece(lot),
        adjustedRevenue: adjustedRevenueFor(lot),
        lotsFromSupplier
      },
      policy
    );

    if (evaluation.status === "blocked") {
      const rule = evaluation.rules.find((r) => r.status === "fail");
      return {
        lot,
        status: "rejected",
        reason: rule ? `${rule.label}: ${rule.detail}` : "Blocked by policy",
        price: lot.wholesalePrice,
        negotiation: null
      };
    }

    if (!forceNegotiate && !policy.autoNegotiate) {
      return evaluation.status === "compliant"
        ? { lot, status: "ok", price: lot.wholesalePrice, negotiation: null }
        : {
            lot,
            status: "rejected",
            reason: "Over policy at list price and auto-negotiate is off",
            price: lot.wholesalePrice,
            negotiation: null
          };
    }

    const negotiation = negotiate(lot, policy, { budget, lotsFromSupplier });
    return negotiation.finalPrice === null
      ? {
          lot,
          status: "rejected",
          reason: negotiation.summary,
          price: lot.wholesalePrice,
          negotiation
        }
      : { lot, status: "ok", price: negotiation.finalPrice, negotiation };
  });
}

/**
 * Create an order for a basket. With Commerce Layer keys this is where a real
 * cart would be built; without them we return a mock order of the same shape.
 */
export function createOrder(
  lotIds: string[],
  policy: BuyingPolicy,
  budget: number,
  forceNegotiate = false
): Order {
  const deals = negotiateBasket(lotIds, policy, budget, forceNegotiate);
  if (deals.length === 0) throw new Error("Unknown lot");

  const accepted = deals.filter((d) => d.status === "ok");
  const lines: OrderLine[] = accepted.map((d) => ({
    lotId: d.lot.id,
    title: d.lot.title,
    wholesaler: d.lot.wholesaler,
    listPrice: d.lot.wholesalePrice,
    price: d.price,
    negotiated: d.negotiation !== null && d.price < d.lot.wholesalePrice
  }));
  const shipping = accepted.reduce((s, d) => s + supplierByName(d.lot.wholesaler).shippingPerLot, 0);
  const subtotalList = lines.reduce((s, l) => s + l.listPrice, 0);
  const goods = lines.reduce((s, l) => s + l.price, 0);

  const eta = new Date();
  eta.setDate(
    eta.getDate() +
      1 +
      Math.max(0, ...accepted.map((d) => supplierByName(d.lot.wholesaler).leadTimeDays))
  );

  const commerceLayerConfigured =
    Boolean(process.env.COMMERCE_LAYER_CLIENT_ID) &&
    Boolean(process.env.COMMERCE_LAYER_ENDPOINT);

  return {
    id: orderId(),
    lines,
    rejected: deals
      .filter((d) => d.status === "rejected")
      .map((d) => ({ lotId: d.lot.id, title: d.lot.title, reason: d.reason ?? "Rejected" })),
    subtotalList,
    savings: subtotalList - goods,
    shipping,
    amount: goods + shipping,
    currency: "GBP",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    estimatedDelivery: eta.toISOString(),
    source: commerceLayerConfigured ? "commerce-layer" : "mock"
  };
}
