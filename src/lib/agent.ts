import { rankLots } from "@/lib/matcher";
import { parseBrief } from "@/lib/parseBrief";
import { buildSummary } from "@/lib/summary";
import { generateLlmSummary, llmAvailable, llmModelName } from "@/lib/llm";
import { sanitizePolicy } from "@/lib/procurement/policy";
import { buildSourcingPlan, procureLot, rankProcured } from "@/lib/procurement/procure";
import type { AgentResult } from "@/lib/types";

export const DEFAULT_BUDGET = 2000;

/**
 * Run the buying agent for a free-text brief under a buying policy.
 * Ranking, policy checks, negotiation and the sourcing plan are always
 * deterministic. If an LLM key is present the model writes the narrative.
 */
export async function runAgent(brief: string, policyInput?: unknown): Promise<AgentResult> {
  const policy = sanitizePolicy(policyInput);
  const dna = parseBrief(brief);
  const budget = dna.budget ?? DEFAULT_BUDGET;

  const candidates = rankLots(dna, 12).map((m) => procureLot(m, policy, budget));
  const plan = buildSourcingPlan(candidates, policy, budget, dna.budget === undefined);
  const matches = rankProcured(candidates).slice(0, 6);

  const base = { dna, matches, plan, policy };

  if (llmAvailable()) {
    const llmSummary = await generateLlmSummary(dna, matches, plan);
    if (llmSummary) {
      return { ...base, summary: llmSummary, source: "llm", llmModel: llmModelName() };
    }
  }

  return { ...base, summary: buildSummary(dna, matches, plan), source: "deterministic" };
}
