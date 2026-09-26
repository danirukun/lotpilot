import { LOTS } from "@/data/lots";
import { gbp } from "@/lib/format";
import type { ProcuredLot, SourcingPlan } from "@/lib/procurement/types";
import type { StoreDNA } from "@/lib/types";
import { rfqSummaryLine } from "@/lib/rfq/format";
import { explicitConstraintCount } from "@/lib/rfq/score";
import type { Rfq } from "@/lib/rfq/types";

/** Canned-but-specific narrative so the demo reads well without an LLM. */
export function buildSummary(
  dna: StoreDNA,
  matches: ProcuredLot[],
  plan: SourcingPlan,
  rfq?: Rfq
): string {
  if (matches.length === 0) {
    return "I couldn't find a confident match in the current catalog. Try describing your aesthetic, categories or budget and I'll re-run the buy.";
  }

  const top = matches[0];
  const aesthetic =
    dna.aesthetics.length > 0
      ? dna.aesthetics.slice(0, 2).map(labelAesthetic).join(" + ")
      : "general secondhand";
  const place = dna.location ? ` in ${dna.location}` : "";
  const budgetLine = plan.budgetAssumed
    ? ` (no budget given, so I assumed ${gbp(plan.budget)})`
    : ` on a ${gbp(plan.budget)} budget`;

  const lines = [
    `Read your store DNA as a ${aesthetic} buyer${place}${budgetLine}. I scanned ${LOTS.length} wholesale lots and checked each one against your buying policy.`,
    ...(rfq && explicitConstraintCount(rfq) > 0 ? [`Your RFQ: ${rfqSummaryLine(rfq)}.`] : []),
    `Top pick: ${top.lot.title} from ${top.lot.wholesaler}${
      top.supplier.keySupplier ? " (a key supplier you have bought from before)" : ""
    }: ${top.rfq && rfq && explicitConstraintCount(rfq) > 0 ? `${top.rfq.score}% RFQ match, ` : ""}${
      top.score
    }/100 fit, supplier ${top.supplier.score}/100, decision score ${top.metrics.decisionScore}, ${
      top.metrics.landedRoiPct
    }% landed ROI.`
  ];

  if (plan.lines.length > 0) {
    lines.push(
      `Recommended opening buy: ${plan.lines.length} lot${plan.lines.length > 1 ? "s" : ""} from ${
        plan.supplierMix.length
      } supplier${plan.supplierMix.length > 1 ? "s" : ""} for ${gbp(plan.totalSpend)} after negotiation (${gbp(
        plan.estimatedSavings
      )} under list), projecting ${gbp(plan.expectedLandedProfit)} landed profit.`
    );
  } else {
    lines.push("No lot clears your policy yet. Loosen a rule in the policy panel and re-run.");
  }

  const blocked = plan.excluded.find((e) => !e.reason.startsWith("Weak store fit"));
  if (blocked) lines.push(`Excluded ${blocked.title}: ${blocked.reason.toLowerCase()}.`);

  lines.push("Negotiate a single lot, or let me negotiate and buy the whole plan.");
  return lines.join(" ");
}

function labelAesthetic(a: string): string {
  const map: Record<string, string> = {
    y2k: "Y2K",
    boho: "boho",
    minimal: "quiet-luxury",
    gorpcore: "gorpcore"
  };
  return map[a] ?? a;
}
