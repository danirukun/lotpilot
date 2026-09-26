"use client";

import { RfqChecks, rfqChipClass } from "@/components/RfqChecks";
import { ScoreBar } from "@/components/ScoreBar";
import { SupplierScorecardDetails } from "@/components/SupplierScorecard";
import { gbp, pct } from "@/lib/format";
import type { PolicyStatus, ProcuredLot, RuleStatus } from "@/lib/procurement/types";

export const STATUS_STYLE: Record<PolicyStatus, { label: string; className: string }> = {
  compliant: { label: "Policy: compliant", className: "bg-brand-500 text-ink" },
  negotiate: { label: "Policy: negotiate", className: "bg-accent-500 text-ink" },
  blocked: { label: "Policy: blocked", className: "bg-red-500 text-paper" }
};

const RULE_ICON: Record<RuleStatus, { icon: string; className: string }> = {
  pass: { icon: "✓", className: "text-brand-400" },
  negotiable: { icon: "↻", className: "text-accent-400" },
  fail: { icon: "✕", className: "text-red-400" }
};

const RISK_STYLE = {
  low: "text-brand-300",
  medium: "text-accent-400",
  high: "text-red-300"
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
  const vsMarket = Math.round((metrics.priceIndex - 1) * 100);

  return (
    <div
      className={`card animate-fade-up flex flex-col overflow-hidden ${
        isTop ? "ring-1 ring-brand-500/50" : ""
      } ${blocked ? "opacity-80" : ""}`}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lot.image} alt={lot.title} className="h-32 w-full object-cover" loading="lazy" />
        <div className="absolute left-3 top-3 flex gap-2">
          {isTop && (
            <span className="rounded-full bg-accent-500 px-2 py-1 text-xs font-bold text-ink">
              Top pick
            </span>
          )}
          <span className="rounded-full bg-ink/80 px-2 py-1 text-xs font-semibold text-paper backdrop-blur">
            {match.score}/100 fit
          </span>
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
              RFQ match {match.rfq.score}%
            </span>
          )}
          <span className="chip">Grade {lot.grade}</span>
          <span className="chip">{lot.pieceCount} pcs</span>
          {lot.aesthetics.slice(0, match.rfq ? 1 : 2).map((a) => (
            <span key={a} className="chip capitalize">
              {a}
            </span>
          ))}
        </div>

        <h3 className="mt-3 font-semibold leading-tight">{lot.title}</h3>
        <SupplierScorecardDetails card={supplier} />

        <ul className="mt-3 space-y-1 text-xs text-paper/70">
          {match.reasons.slice(0, 3).map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-0.5 text-brand-400">▸</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <ScoreBar label="Fit" value={match.fitScore} />
          <ScoreBar label="Supplier" value={supplier.score} />
          <ScoreBar label="Decision" value={metrics.decisionScore} tone="accent" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-line bg-ink/50 p-3 text-center">
          <Metric label="List" value={gbp(economics.wholesalePrice)} />
          <Metric label="Landed ROI" value={pct(metrics.landedRoiPct)} accent />
          <Metric
            label="vs market"
            value={`${vsMarket > 0 ? "+" : ""}${vsMarket}%`}
            className={vsMarket > 5 ? "text-accent-400" : "text-brand-300"}
          />
          <Metric label="Landed profit" value={gbp(metrics.landedProfit)} accent />
          <Metric label="On-time" value={pct(supplier.onTimeRate * 100)} />
          <Metric
            label="Risk"
            value={metrics.riskLevel}
            className={`capitalize ${RISK_STYLE[metrics.riskLevel]}`}
          />
        </div>

        <details className="group mt-3 rounded-xl border border-ink-line bg-ink/30 px-3 py-2 text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between text-paper/70">
            <span>
              Policy checks ·{" "}
              {policy.rules.filter((r) => r.status === "pass").length}/{policy.rules.length} pass
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
        </details>

        {match.rfq && match.rfq.checks.length > 0 && <RfqChecks rfq={match.rfq} />}

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

function Metric({
  label,
  value,
  accent,
  className = ""
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-paper/45">{label}</div>
      <div
        className={`mt-0.5 text-sm font-semibold ${
          className || (accent ? "text-brand-300" : "text-paper")
        }`}
      >
        {value}
      </div>
    </div>
  );
}
