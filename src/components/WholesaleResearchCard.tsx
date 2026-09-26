"use client";
import { useEffect, useState } from "react";
import { SupplierLeadCard } from "@/components/SupplierLeadCard";
import type { WholesaleResearch } from "@/lib/wholesale/types";

export function WholesaleResearchCard({ research }: { research: WholesaleResearch }) {
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  useEffect(() => {
    try { const saved = localStorage.getItem("lotpilot-matches-layout"); if (saved === "grid" || saved === "list") setLayout(saved); } catch { /* optional preference */ }
  }, []);
  const choose = (value: "grid" | "list") => {
    setLayout(value);
    try { localStorage.setItem("lotpilot-matches-layout", value); } catch { /* optional preference */ }
  };
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <span className="label-eyebrow">Supplier research</span>
        <h3 className="mt-1 font-display text-xl">{research.leads.length ? `${research.leads.length} sourced supplier leads` : research.status === "empty" ? "No matching sources in the index" : "Sourcing unavailable"}</h3>
      </div>
      {research.leads.length > 0 && <div role="group" aria-label="Result layout" className="flex rounded-full border border-ink-line bg-ink/50 p-1">
        {(["grid", "list"] as const).map(value => <button key={value} type="button" aria-pressed={layout === value} onClick={() => choose(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${layout === value ? "bg-brand-500 text-onbrand" : "text-paper/60"}`}><span aria-hidden="true">{value === "grid" ? "▦" : "☰"}</span> {value}</button>)}
      </div>}
    </div>
    <p className="text-xs text-paper/60">{research.leads.length ? "Source descriptions ranked for your shop. Confirm stock, condition and prices directly with suppliers." : research.notes[0]}</p>
    <div className={layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
      {research.leads.map((lead, rank) => <SupplierLeadCard key={lead.url} lead={lead} rank={rank} layout={layout} />)}
    </div>
    <details className="card p-4 text-xs text-paper/60">
      <summary className="cursor-pointer">Retrieval evidence {research.cached ? "· cached research" : ""}</summary>
      <ul className="mt-2 space-y-2">{research.notes.map(note => <li key={note}>{note}</li>)}</ul>
      <p className="mt-2 break-words">Query: {research.query || "No supported query"}</p>
    </details>
  </section>;
}
