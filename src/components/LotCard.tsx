"use client";

import { RadarChart } from "@/components/RadarChart";
import { rfqChipClass } from "@/components/RfqChecks";
import { SupplierScorecardDetails } from "@/components/SupplierScorecard";
import { gbp, pct } from "@/lib/format";
import type { PolicyStatus, ProcuredLot, RuleStatus } from "@/lib/procurement/types";

export const STATUS_STYLE: Record<PolicyStatus, { label: string; className: string }> = {
  compliant: { label: "Compliant", className: "bg-brand-500 text-ink" },
  negotiate: { label: "Negotiate", className: "bg-accent-500 text-ink" },
  blocked: { label: "Blocked", className: "bg-red-500 text-paper" }
};

const RULE_ICON: Record<RuleStatus, { icon: string; className: string }> = {
  pass: { icon: "✓", className: "text-brand-400" },
  negotiable: { icon: "↻", className: "text-accent-400" },
  fail: { icon: "✕", className: "text-red-400" }
};

export function LotCard({
  match,
  rank,
  onBuy,
  onNegotiate,
  disabled
}: {
  match: ProcuredLot;
  rank: number;
  onBuy: (match: ProcuredLot) => void;
  onNegotiate: (match: ProcuredLot) => void;
  disabled?: boolean;
}) {
  const { lot, economics, supplier, metrics, policy } = match;
  const isTop = rank === 0 && policy.status !== "blocked";
  const blocked = policy.status === "blocked";
  const policyPass = policy.rules.filter((r) => r.status === "pass").length;
  const radarAxes = [
    { label: "Fit", value: match.fitScore },
    { label: "Supplier", value: supplier.score },
    { label: "ROI", value: Math.min(100, Math.max(0, metrics.landedRoiPct)) },
    { label: "On-time", value: Math.round(supplier.onTimeRate * 100) },
    { label: "Decision", value: metrics.decisionScore }
  ];

  return (
    <div
      className={`card animate-fade-up flex flex-col overflow-hidden ${
        isTop ? "ring-1 ring-brand-500/50" : ""
      } ${blocked ? "opacity-80" : ""}`}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lot.image} alt={lot.title} className="h-28 w-full object-cover" loading="lazy" />
        <div className="absolute left-3 top-3 flex gap-2">
          {isTop && (
            <span className="rounded-full bg-accent-500 px-2 py-1 text-xs font-bold text-ink">
              Top pick
            </span>
          )}
        </div>
        <span
          className={`absolute bottom-3 right-3 rounded-full px-2 py-1 text-[11px] font-bold ${
            STATUS_STYLE[policy.status].className
          }`}
        >
          {STATUS_STYLE[policy.status].label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {match.rfq && (
            <span className={`chip font-semibold ${rfqChipClass(match.rfq.score)}`}>
              RFQ {match.rfq.score}%
            </span>
          )}
          <span className="chip">Grade {lot.grade}</span>
          <span className="chip">{lot.pieceCount} pcs</span>
        </div>

        <h3 className="mt-2.5 font-semibold leading-snug">{lot.title}</h3>
        <SupplierScorecardDetails card={supplier} />

        {match.reasons[0] && (
          <p className="mt-2 text-xs leading-relaxed text-paper/65">
            <span className="text-brand-400">▸</span> {match.reasons[0]}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <div className="mx-auto h-[168px] w-[168px] shrink-0 text-paper">
            <RadarChart axes={radarAxes} />
          </div>
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-ink-line/80 pt-3 text-sm">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-paper/45">List</span>
            <div className="font-semibold">{gbp(economics.wholesalePrice)}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wide text-paper/45">Landed</span>
            <div className="font-semibold text-brand-300">
              {gbp(metrics.landedProfit)}
              <span className="ml-1.5 text-xs font-medium text-paper/50">
                {pct(metrics.landedRoiPct)} ROI
              </span>
            </div>
          </div>
        </div>

        <details className="group mt-3 rounded-xl border border-ink-line bg-ink/30 px-3 py-2 text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between text-paper/70">
            <span>
              Checks · {policyPass}/{policy.rules.length} policy
              {match.rfq ? ` · ${match.rfq.checks.filter((c) => c.status === "met").length}/${match.rfq.checks.length} RFQ` : ""}
            </span>
            <span className="transition group-open:rotate-180">▾</span>
          </summary>
          <ul className="mt-2 space-y-1">
            {policy.rules.map((r) => (
              <li key={r.id} className="flex gap-2">
                <span className={`w-3 shrink-0 font-bold ${RULE_ICON[r.status].className}`}>
                  {RULE_ICON[r.status].icon}
                </span>
                <span className="text-paper/80">
                  {r.label}
                  <span className="block text-paper/45">{r.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          {match.rfq && match.rfq.checks.length > 0 && (
            <div className="mt-2 border-t border-ink-line/70 pt-2">
              <RfqChecksInline rfq={match.rfq} />
            </div>
          )}
        </details>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <button
            type="button"
            onClick={() => onNegotiate(match)}
            disabled={disabled || blocked}
            className="btn-ghost px-3"
          >
            Negotiate
          </button>
          <button
            type="button"
            onClick={() => onBuy(match)}
            disabled={disabled || blocked}
            className="btn-primary px-3"
          >
            {blocked ? "Blocked" : "Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RfqChecksInline({ rfq }: { rfq: NonNullable<ProcuredLot["rfq"]> }) {
  const ICON = {
    met: { icon: "✓", className: "text-brand-400" },
    partial: { icon: "◐", className: "text-accent-400" },
    missed: { icon: "✕", className: "text-red-400" }
  } as const;

  return (
    <ul className="space-y-1">
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
  );
}
