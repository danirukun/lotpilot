"use client";

import { RadarChart, type RadarAxis } from "@/components/RadarChart";
import type { WholesaleLead } from "@/lib/wholesale/types";

export function SupplierLeadCard({ lead, rank, layout = "grid" }: {
  lead: WholesaleLead; rank: number; layout?: "grid" | "list";
}) {
  const axes: RadarAxis[] = [
    { label: "Source", value: lead.sourceUrl ? 100 : null, displayValue: lead.sourceUrl ? "Linked" : "—" },
    { label: "Fetched", value: lead.retrievedAt ? 100 : null, displayValue: lead.retrievedAt ? "Dated" : "—" },
    { label: "Text", value: lead.evidence?.keywordRank != null ? 100 : null, displayValue: lead.evidence?.keywordRank != null ? "Found" : "—" },
    { label: "Fuzzy", value: lead.evidence?.fuzzyRank != null ? 100 : null, displayValue: lead.evidence?.fuzzyRank != null ? "Found" : "—" },
    { label: "Stock", value: null }
  ];
  return <article className={`card animate-fade-up overflow-hidden ${rank === 0 ? "ring-1 ring-brand-500/40" : ""}`}>
    <div className="flex items-center justify-between border-b border-ink-line bg-gradient-to-r from-brand-500/15 via-ink-soft to-ink px-4 py-3">
      <span className={`chip ${rank === 0 ? "border-brand-500/50 text-brand-300" : ""}`}>#{rank + 1} in retrieved results</span>
      <span className="text-[10px] uppercase tracking-widest text-paper/50">Source profile</span>
    </div>
    <div className={`p-4 ${layout === "list" ? "sm:grid sm:grid-cols-[1fr_180px] sm:gap-4" : ""}`}>
      <div>
        <h3 className="font-display text-xl leading-tight">{lead.name}</h3>
        <p className="mt-1 text-xs text-paper/50">{lead.retrievedAt ? `Fetched ${new Date(lead.retrievedAt).toLocaleDateString("en-GB", { timeZone: "UTC" })}` : "Fetch date unknown"}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-paper/70">{lead.snippet}</p>
        <details className="mt-2 text-xs text-paper/60">
          <summary className="cursor-pointer text-brand-300">Source excerpt &amp; retrieval</summary>
          <p className="mt-2 leading-relaxed">{lead.snippet}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-ink-line p-3">
            <dt>Full-text rank</dt><dd>{lead.evidence?.keywordRank ?? "No match"}</dd>
            <dt>Fuzzy rank</dt><dd>{lead.evidence?.fuzzyRank ?? "No match"}</dd>
            <dt>RRF score</dt><dd>{lead.rrfScore?.toFixed(5) ?? "Unavailable"}</dd>
          </dl>
        </details>
      </div>
      <figure className="mx-auto mt-3 w-[200px] max-w-full text-paper">
        <div className="h-[176px]"><RadarChart axes={axes} /></div>
        <figcaption className="text-center text-[10px] text-paper/50">Evidence availability · — means unverified<br />Indicators show presence, not quality scores.</figcaption>
      </figure>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-line pt-3 text-xs sm:col-span-2">
        {["Lot price", "ROI", "Reliability"].map(label => <div key={label}><span className="block text-[10px] uppercase tracking-wide text-paper/45">{label}</span><span className="mt-1 block text-paper/65">Not verified</span></div>)}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 sm:col-span-2">
        <span className="text-[11px] text-paper/50">Stock and grades need confirmation</span>
        <a href={lead.sourceUrl ?? lead.url} target="_blank" rel="noopener noreferrer" className="btn-primary shrink-0 px-3 py-2 text-xs">View supplier ↗</a>
      </div>
    </div>
  </article>;
}
