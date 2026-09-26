"use client";
import type { WholesaleResearch } from "@/lib/wholesale/types";
export function WholesaleResearchCard({ research }: { research: WholesaleResearch }) {
  return <div className="card overflow-hidden">
    <div className="space-y-2 p-5">
      <span className="label-eyebrow">Supplier research</span>
      <h3 className="font-display text-xl">{research.leads.length ? `${research.leads.length} sourced supplier leads` : research.status === "empty" ? "No matching sources in the index" : "Sourcing unavailable"}</h3>
      <p className="text-sm text-paper/65">{research.leads.length ? "These are supplier descriptions. Confirm availability, grades and prices directly; no purchasable lots are verified." : research.notes[0]}</p>
      {research.cached && <span className="chip">Cached research</span>}
    </div>
    <ol className="divide-y divide-ink-line">{research.leads.map((lead, i) => <li key={lead.url} className="space-y-2 border-t border-ink-line p-5">
      <a className="font-semibold text-brand-300 hover:underline" href={lead.sourceUrl ?? lead.url} target="_blank" rel="noopener noreferrer">[{i + 1}] {lead.name} ↗</a>
      <p className="text-xs text-paper/50">Supplier profile · {lead.retrievedAt ? `Fetched ${new Date(lead.retrievedAt).toLocaleDateString("en-GB")}` : "Fetch date unknown"}</p>
      <p className="whitespace-pre-line text-sm text-paper/75">{lead.snippet}</p>
    </li>)}</ol>
    <details className="border-t border-ink-line p-5 text-xs text-paper/60">
      <summary className="cursor-pointer">Retrieval evidence</summary>
      <ul className="mt-2 space-y-2">{research.notes.map(note => <li key={note}>{note}</li>)}</ul>
      <p className="mt-2 break-words">Query: {research.query || "No supported query"}</p>
      {research.leads.map(lead => <p className="mt-2" key={lead.url}>{lead.name}: full-text rank {lead.evidence?.keywordRank ?? "—"}, fuzzy rank {lead.evidence?.fuzzyRank ?? "—"}, RRF {lead.rrfScore?.toFixed(5) ?? "—"}</p>)}
    </details>
  </div>;
}
