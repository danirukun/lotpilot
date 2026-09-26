import { BENCHMARKS } from "@/data/benchmarks";
import { supplierByName } from "@/data/suppliers";
import { computeEconomics } from "@/lib/economics";
import { gbp, gbp2 } from "@/lib/format";
import { maxAcceptablePrice, scoreSupplier, volumeDiscountPct } from "@/lib/procurement/policy";
import type {
  BuyingPolicy,
  NegotiationResult,
  NegotiationRound
} from "@/lib/procurement/types";
import type { WholesaleLot } from "@/lib/types";

const floor5 = (n: number) => Math.floor(n / 5) * 5;
const ceil5 = (n: number) => Math.ceil(n / 5) * 5;

export interface NegotiationContext {
  budget: number;
  lotsFromSupplier: number;
}

export function adjustedRevenueFor(lot: WholesaleLot): number {
  const supplier = supplierByName(lot.wholesaler);
  return computeEconomics(lot).projectedRevenue * (1 - (1 - supplier.gradeAccuracy) * 0.5);
}

export function marketPricePerPiece(lot: WholesaleLot): number {
  return BENCHMARKS[lot.id]?.marketPricePerPiece ?? lot.wholesalePrice / lot.pieceCount;
}

/**
 * Simulated bilateral negotiation. The buyer concedes on a Boulware curve
 * (holds firm early, moves late) from an anchored opening towards the policy
 * walk-away price. The supplier concedes halfway to the buyer each round but
 * never below a hidden floor, which drops as the buyer unlocks levers.
 */
export function negotiate(
  lot: WholesaleLot,
  policy: BuyingPolicy,
  ctx: NegotiationContext
): NegotiationResult {
  const supplier = supplierByName(lot.wholesaler);
  const scorecard = scoreSupplier(supplier);
  const bench = BENCHMARKS[lot.id];
  const market = marketPricePerPiece(lot);
  const adjustedRevenue = adjustedRevenueFor(lot);
  const list = lot.wholesalePrice;
  const priceIndex = list / lot.pieceCount / market;

  const walkAway = Math.min(
    list,
    floor5(maxAcceptablePrice(
      {
        lot,
        supplier,
        scorecard,
        budget: ctx.budget,
        marketPricePerPiece: market,
        adjustedRevenue,
        lotsFromSupplier: ctx.lotsFromSupplier
      },
      policy
    ))
  );

  const fairValue = market * lot.pieceCount;
  const opening = Math.min(
    floor5(walkAway * 0.95),
    Math.max(list * 0.6, floor5(Math.min(list * (1 - policy.targetDiscountPct / 100), fairValue)))
  );

  const rounds: NegotiationRound[] = [];
  const leversUsed: string[] = [];
  const volumePct = policy.allowBundling ? volumeDiscountPct(supplier, ctx.lotsFromSupplier) : 0;
  const concession = priceIndex > policy.maxPriceIndex ? 0.6 : 0.5;
  const T = Math.max(1, policy.maxRounds);

  const buyerOffer = (t: number) =>
    Math.min(walkAway, floor5(opening + (walkAway - opening) * Math.pow((t - 1) / Math.max(1, T - 1), 1.6)));

  const finish = (finalPrice: number | null): NegotiationResult => {
    const agreed = finalPrice !== null;
    const savings = agreed ? list - finalPrice : 0;
    return {
      lotId: lot.id,
      lotTitle: lot.title,
      wholesaler: lot.wholesaler,
      listPrice: list,
      openingOffer: opening,
      walkAwayPrice: walkAway,
      finalPrice,
      status: agreed ? "agreed" : "walked-away",
      savings,
      savingsPct: agreed ? Math.round((savings / list) * 1000) / 10 : 0,
      rounds,
      leversUsed,
      summary: agreed
        ? `Agreed ${gbp(finalPrice)} against ${gbp(list)} list: ${gbp(savings)} saved in ${
            rounds.filter((r) => r.party === "buyer").length
          } rounds${leversUsed.length ? ` using ${leversUsed.join(", ").toLowerCase()}` : ""}.`
        : `No deal. The supplier's best was above our policy ceiling of ${gbp(
            walkAway
          )}. LotPilot walked away.`
    };
  };

  if (opening >= list) {
    rounds.push({
      round: 1,
      party: "buyer",
      amount: list,
      message: `List price ${gbp(list)} is already inside policy and at market. Accepting.`,
      levers: []
    });
    return finish(list);
  }

  let floor = list * (1 - supplier.negotiationFlex);
  let ask = list;

  for (let t = 1; t <= T; t++) {
    const offer = buyerOffer(t);
    const levers: string[] = [];
    let message: string;

    if (t === 1) {
      levers.push("Market comparables");
      message = bench
        ? `Opening at ${gbp(offer)}. ${bench.comparables} comparable lots cleared at ${gbp2(
            market
          )}/pc in the last 90 days; your list is ${gbp2(list / lot.pieceCount)}/pc (${
            priceIndex >= 1 ? "+" : ""
          }${Math.round((priceIndex - 1) * 100)}%).`
        : `Opening at ${gbp(offer)}, in line with recent comparable lots.`;
    } else if (t === 2 && policy.allowEarlyPayment && supplier.earlyPaymentDiscountPct > 0) {
      levers.push("Early payment");
      floor *= 1 - supplier.earlyPaymentDiscountPct / 100;
      message = `${gbp(offer)} and we settle within 24 hours of confirmation.`;
    } else if (t === 3 && volumePct > 0) {
      levers.push("Volume bundle");
      floor *= 1 - volumePct / 100;
      message = `${gbp(offer)}. We are taking ${ctx.lotsFromSupplier} lots from you in this order, which puts us in your ${volumePct}% volume tier.`;
    } else if (t === T) {
      message = `${gbp(offer)} is our final offer. It is the ceiling our buying policy allows.`;
    } else {
      levers.push("Repeat-order intent");
      message = `${gbp(offer)}. If sell-through is on plan we will re-order monthly from you.`;
    }
    leversUsed.push(...levers);
    rounds.push({ round: t, party: "buyer", amount: offer, message, levers });

    if (offer >= floor && (ask - offer) / ask <= 0.02) {
      rounds.push({
        round: t,
        party: "supplier",
        amount: offer,
        message: `Deal at ${gbp(offer)}.`,
        levers: []
      });
      return finish(offer);
    }

    const nextAsk = Math.max(ceil5(floor), ceil5(ask - (ask - Math.max(offer, floor)) * concession));
    ask = Math.min(ask, nextAsk);
    const atFloor = ask <= ceil5(floor);
    rounds.push({
      round: t,
      party: "supplier",
      amount: ask,
      message: supplierLine(t, ask, atFloor, lot.grade),
      levers: []
    });

    if (atFloor && ask > walkAway && t >= 2) break;

    const nextOffer = t < T ? buyerOffer(t + 1) : walkAway;
    if (ask <= walkAway && (ask <= nextOffer || t === T)) {
      rounds.push({
        round: t + 1,
        party: "buyer",
        amount: ask,
        message: `Agreed at ${gbp(ask)}. Placing the order.`,
        levers: []
      });
      return finish(ask);
    }
  }

  rounds.push({
    round: rounds[rounds.length - 1].round + 1,
    party: "buyer",
    amount: walkAway,
    message: `Our ceiling is ${gbp(walkAway)}. We will pass on this lot for now.`,
    levers: []
  });
  return finish(null);
}

function supplierLine(t: number, ask: number, atFloor: boolean, grade: string): string {
  if (atFloor) return `${gbp(ask)} is the lowest we can go on this lot.`;
  const lines = [
    `We can come down to ${gbp(ask)}. These are hand-sorted Grade ${grade}.`,
    `Meet us at ${gbp(ask)} and it ships tomorrow.`,
    `${gbp(ask)}. That already beats what our other buyers pay.`,
    `${gbp(ask)} is close to our cost on this one.`
  ];
  return lines[(t - 1) % lines.length];
}
