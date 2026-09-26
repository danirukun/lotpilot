import { LOTS } from "@/data/lots";
import { supplierByName } from "@/data/suppliers";
import { rankLots } from "@/lib/matcher";
import { KEY_SUPPLIER_BOOST, withPurchaseHistory } from "@/lib/procurement/keySuppliers";
import { scoreSupplier } from "@/lib/procurement/policy";
import { procureLot } from "@/lib/procurement/procure";
import type { BuyingPolicy, ProcuredLot } from "@/lib/procurement/types";
import { scoreRfq } from "@/lib/rfq/score";
import type { Rfq } from "@/lib/rfq/types";
import type { StoreDNA } from "@/lib/types";

/** Pull toward stronger suppliers: ±0.2 relevance points per scorecard point around 85. */
const SUPPLIER_PULL = 0.2;

/**
 * Score the whole catalog against the RFQ, not just the top vibe matches, and
 * keep the best candidates by RFQ/vibe relevance with a supplier-score pull.
 */
export function selectCandidates(
  dna: StoreDNA,
  rfq: Rfq,
  policy: BuyingPolicy,
  budget: number,
  personaId?: string,
  limit = 12
): ProcuredLot[] {
  return rankLots(dna, LOTS.length)
    .map((match) => {
      const rfqMatch = scoreRfq(match, rfq, policy);
      const supplier = withPurchaseHistory(scoreSupplier(supplierByName(match.lot.wholesaler)), personaId);
      const key =
        rfqMatch.relevance +
        (supplier.score - 85) * SUPPLIER_PULL +
        (supplier.keySupplier ? KEY_SUPPLIER_BOOST : 0);
      return { match, rfqMatch, key, supplierScore: supplier.score };
    })
    .sort((a, b) => b.key - a.key || b.supplierScore - a.supplierScore)
    .slice(0, limit)
    .map(({ match, rfqMatch }) => procureLot(match, policy, budget, 1, { rfq: rfqMatch, personaId }));
}
