"use client";

import { formatDate, pct } from "@/lib/format";
import type { SupplierScorecard as Scorecard } from "@/lib/procurement/types";

const BAND_STYLE: Record<Scorecard["band"], string> = {
  A: "bg-brand-500/20 text-brand-200 border-brand-500/50",
  B: "bg-sky-400/15 text-sky-200 border-sky-400/40",
  C: "bg-accent-500/15 text-accent-400 border-accent-500/40",
  D: "bg-red-500/15 text-red-300 border-red-500/40"
};

export function KeySupplierLabel({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-400 ${className}`}
      title="You have bought from this supplier before and it scores 85+"
    >
      ★ Key supplier
    </span>
  );
}

export function SupplierScoreBadge({ card }: { card: Scorecard }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${BAND_STYLE[card.band]}`}
      title={`Overall supplier score ${card.score}/100 (band ${card.band})`}
    >
      {card.score}
      <span className="font-medium opacity-70">/100</span>
    </span>
  );
}

/** Supplier name, overall score and an expandable scorecard. */
export function SupplierScorecardDetails({ card }: { card: Scorecard }) {
  const rows: { label: string; value: string; bar?: number; invert?: boolean }[] = [
    { label: "Reliability", value: pct(card.reliability), bar: card.reliability },
    { label: "Grade consistency", value: pct(card.gradeConsistency), bar: card.gradeConsistency },
    { label: "Fill rate", value: pct(card.fillRate), bar: card.fillRate },
    {
      label: "QC / return risk",
      value: `${card.qcReturnRisk.toFixed(1)}%`,
      bar: Math.min(100, card.qcReturnRisk * 10),
      invert: true
    }
  ];

  return (
    <details className="group mt-1 text-xs">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-1.5 text-paper/60 hover:text-paper/80">
        <span className="truncate">{card.name}</span>
        <SupplierScoreBadge card={card} />
        {card.keySupplier && <KeySupplierLabel />}
        <span className="text-paper/35 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-2 rounded-xl border border-ink-line bg-ink/40 p-3">
        <div className="flex items-center justify-between text-[11px] text-paper/50">
          <span>
            {card.tier} · {card.yearsOnFleek} yrs on Fleek · ★ {card.rating.toFixed(1)}
          </span>
          <span>{card.ordersTracked} orders tracked</span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between text-paper/70">
                <span>{r.label}</span>
                <span className="font-semibold text-paper/90">{r.value}</span>
              </div>
              {r.bar !== undefined && (
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-ink-line">
                  <div
                    className={`h-full rounded-full ${r.invert ? "bg-accent-500" : "bg-brand-500"}`}
                    style={{ width: `${r.bar}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between text-paper/60">
          <span>Lead time</span>
          <span className="font-semibold text-paper/90">
            {card.leadTimeDays} day{card.leadTimeDays === 1 ? "" : "s"}
          </span>
        </div>
        {card.history && (
          <p className="mt-2 border-t border-ink-line/70 pt-2 text-paper/60">
            Bought before: <span className="font-semibold text-paper/90">{card.history.orders} orders</span>,{" "}
            {card.history.onTimeOrders}/{card.history.orders} on time, last {formatDate(card.history.lastOrder)}
          </p>
        )}
      </div>
    </details>
  );
}
