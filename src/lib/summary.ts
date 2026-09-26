import { LOTS } from "@/data/lots";
import type { LotScore, StoreDNA } from "@/lib/types";

/** Canned-but-specific narrative so the demo reads well without an LLM. */
export function buildSummary(dna: StoreDNA, matches: LotScore[]): string {
  if (matches.length === 0) {
    return "I couldn't find a confident match in the current catalog. Try describing your aesthetic, categories or budget and I'll re-run the buy.";
  }

  const top = matches[0];
  const aesthetic =
    dna.aesthetics.length > 0
      ? dna.aesthetics.slice(0, 2).map(labelAesthetic).join(" + ")
      : "your store";
  const place = dna.location ? ` in ${dna.location}` : "";
  const budgetLine = dna.budget ? ` on a \u00A3${dna.budget.toLocaleString()} budget` : "";

  const affordable = dna.budget
    ? matches.filter((m) => m.budgetFit).slice(0, 3)
    : matches.slice(0, 3);
  const basketCost = affordable.reduce((sum, m) => sum + m.lot.wholesalePrice, 0);
  const basketProfit = affordable.reduce((sum, m) => sum + m.economics.projectedProfit, 0);

  const lines = [
    `Read your store DNA as a ${aesthetic} buyer${place}${budgetLine}. I scanned ${LOTS.length} wholesale lots and ranked the best fits below.`,
    `Top pick: ${top.lot.title} from ${top.lot.wholesaler} — ${top.score}/100 fit, ~${Math.round(top.economics.roiPct)}% projected ROI on £${top.lot.wholesalePrice}.`
  ];

  if (affordable.length > 1) {
    lines.push(
      `A ${affordable.length}-lot opening buy (£${basketCost.toLocaleString()}) projects roughly £${Math.round(
        basketProfit
      ).toLocaleString()} gross profit once sold through.`
    );
  }

  lines.push("Confirm any lot to run a simulated wholesale checkout.");
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
