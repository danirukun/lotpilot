"use client";

import type { RfqCheckStatus, RfqMatch } from "@/lib/rfq/types";

const ICON: Record<RfqCheckStatus, { icon: string; className: string }> = {
  met: { icon: "✓", className: "text-brand-400" },
  partial: { icon: "◐", className: "text-accent-400" },
  missed: { icon: "✕", className: "text-red-400" }
};

export function rfqChipClass(score: number): string {
  return score >= 80
    ? "border-brand-500/60 bg-brand-500/15 text-brand-200"
    : score >= 55
      ? "border-accent-500/50 bg-accent-500/10 text-accent-400"
      : "border-red-500/40 bg-red-500/10 text-red-300";
}

export function RfqChecks({ rfq }: { rfq: RfqMatch }) {
  const met = rfq.checks.filter((c) => c.status === "met").length;
  return (
    <details className="group mt-3 rounded-xl border border-ink-line bg-ink/30 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between text-paper/70">
        <span>
          RFQ checks · {met}/{rfq.checks.length} met
        </span>
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <ul className="mt-2 space-y-1">
        {rfq.checks.map((c) => (
          <li key={c.id} className="flex gap-2">
            <span className={`w-3 shrink-0 font-bold ${ICON[c.status].className}`}>{ICON[c.status].icon}</span>
            <span className="text-paper/80">
              {c.label}
              {c.hard && c.status === "missed" && <span className="ml-1 text-red-300">(hard limit)</span>}
              <span className="block text-paper/45">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
