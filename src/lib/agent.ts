import { rankLots } from "@/lib/matcher";
import { parseBrief } from "@/lib/parseBrief";
import { buildSummary } from "@/lib/summary";
import { generateLlmSummary, llmAvailable, llmModelName } from "@/lib/llm";
import type { AgentResult } from "@/lib/types";

/**
 * Run the buying agent for a free-text brief.
 * Ranking + economics are always deterministic. If an LLM key is present the
 * model writes the narrative; otherwise a canned-but-specific summary is used.
 */
export async function runAgent(brief: string): Promise<AgentResult> {
  const dna = parseBrief(brief);
  const matches = rankLots(dna, 6);

  if (llmAvailable()) {
    const llmSummary = await generateLlmSummary(dna, matches);
    if (llmSummary) {
      return { dna, matches, summary: llmSummary, source: "llm", llmModel: llmModelName() };
    }
  }

  return { dna, matches, summary: buildSummary(dna, matches), source: "deterministic" };
}
