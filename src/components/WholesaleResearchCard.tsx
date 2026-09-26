"use client";

import type { WholesaleResearch } from "@/lib/wholesale/types";

const MODE_LABEL: Record<WholesaleResearch["mode"], string> = {
  live: "Live search",
  index: "Directory index",
  mixed: "Index + live"
};

export function WholesaleResearchCard({ research }: { research: WholesaleResearch }) {
  if (research.leads.length === 0) return null;

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <span className="label-eyebrow">UK wholesale index</span>
          <h3 className="mt-1 font-display text-xl">Suppliers beyond the seeded catalog</h3>
          <p className="mt-1 text-sm text-paper/65">
            Directory leads from{" "}
            <a
              href="https://www.thewholesaler.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:underline"
            >
              thewholesaler.co.uk
            </a>
            {research.mode !== "index" ? " plus live web research." : "."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip py-0.5">{MODE_LABEL[research.mode]}</span>
          {research.cached && (
            <span className="chip py-0.5 text-paper/60" title={research.cachedAt}>
              Cached
            </span>
          )}
        </div>
      </div>

      <ul className="divide-y divide-ink-line/80 border-t border-ink-line/80">
        {research.leads.map((lead) => (
          <li key={lead.url} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5">
            <div className="min-w-0">
              <a
                href={lead.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-paper hover:text-brand-300"
              >
                {lead.name} ↗
              </a>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-paper/55">
                <span className="chip py-0.5">{lead.category}</span>
                <span>{lead.why}</span>
              </div>
              {lead.snippet && <p className="mt-1 text-xs leading-relaxed text-paper/65">{lead.snippet}</p>}
            </div>
            <div className="shrink-0 text-xs font-semibold tabular-nums text-brand-300 sm:pt-1">
              {lead.score}/100
            </div>
          </li>
        ))}
      </ul>

      <details className="border-t border-ink-line/80 px-4 py-2 sm:px-5">
        <summary className="cursor-pointer list-none text-xs text-paper/55">
          Research notes · {research.notes.length}
        </summary>
        <ul className="mt-2 space-y-1 pb-2 text-xs text-paper/60">
          {research.notes.map((n) => (
            <li key={n}>· {n}</li>
          ))}
          <li className="text-paper/40">Query: {research.query}</li>
        </ul>
      </details>
    </div>
  );
}
