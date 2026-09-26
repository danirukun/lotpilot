"use client";

import { RadarChart } from "@/components/RadarChart";
import { rfqChipClass } from "@/components/RfqChecks";
import { SupplierScorecardDetails } from "@/components/SupplierScorecard";
import { gbp, pct } from "@/lib/format";
import type { PolicyStatus, ProcuredLot, RuleStatus } from "@/lib/procurement/types";

export type LotCardLayout = "grid" | "list";

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
  disabled,
  layout = "grid"
}: {
  match: ProcuredLot;
  rank: number;
  onBuy: (match: ProcuredLot) => void;
  onNegotiate: (match: ProcuredLot) => void;
  disabled?: boolean;
  layout?: LotCardLayout;
}) {
  if (layout === "list") {
    return (
      <LotListRow
        match={match}
        rank={rank}
        onBuy={onBuy}
        onNegotiate={onNegotiate}
        disabled={disabled}
      />
    );
  }

  const { lot, economics, supplier, metrics, policy } = match;
  const isTop = rank === 0 && policy.status !== "blocked";
  const blocked = policy.status === "blocked";
  const policyPass = policy.rules.filter((r) => r.status === "pass").length;
  const radarAxes = radarFor(match);

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

        <div className="mx-auto mt-2 h-[152px] w-[180px] shrink-0 text-paper">
          <RadarChart axes={radarAxes} />
        </div>

        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-ink-line/80 pt-3 text-sm">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-paper/45">List</span>
            <div className="font-semibold">{gbp(economics.wholesalePrice)}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wide text-paper/45">Profit</span>
            <div className="font-semibold text-brand-300">
              {gbp(metrics.landedProfit)}
              <span className="ml-1.5 text-xs font-medium text-paper/50">
                {pct(metrics.landedRoiPct)} ROI
              </span>
            </div>
          </div>
        </div>

        <PolicyChecks match={match} policyPass={policyPass} />

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

function LotListRow({
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
  const radarAxes = radarFor(match);

  return (
    <div
      className={`card animate-fade-up overflow-hidden ${isTop ? "ring-1 ring-brand-500/50" : ""} ${
        blocked ? "opacity-80" : ""
      }`}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4">
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lot.image} alt={lot.title} className="h-full w-full object-cover" loading="lazy" />
          {isTop && (
            <span className="absolute left-2 top-2 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-ink">
              Top
            </span>
          )}
          <span
            className={`absolute bottom-2 right-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              STATUS_STYLE[policy.status].className
            }`}
          >
            {STATUS_STYLE[policy.status].label}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {match.rfq && (
              <span className={`chip py-0.5 font-semibold ${rfqChipClass(match.rfq.score)}`}>
                RFQ {match.rfq.score}%
              </span>
            )}
            <span className="chip py-0.5">Grade {lot.grade}</span>
            <span className="chip py-0.5">{lot.pieceCount} pcs</span>
          </div>
          <h3 className="mt-1.5 font-semibold leading-snug">{lot.title}</h3>
          <SupplierScorecardDetails card={supplier} />
          {match.reasons[0] && (
            <p className="mt-1.5 line-clamp-1 text-xs text-paper/65">
              <span className="text-brand-400">▸</span> {match.reasons[0]}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper/60">
            <MetricPill label="Fit" value={match.fitScore} />
            <MetricPill label="Supplier" value={supplier.score} />
            <MetricPill label="Decision" value={metrics.decisionScore} />
            <MetricPill label="ROI" value={Math.round(metrics.landedRoiPct)} suffix="%" />
          </div>

          <div className="mt-2 sm:hidden">
            <PolicyChecks match={match} policyPass={policyPass} />
          </div>
        </div>

        <div className="hidden w-[120px] shrink-0 self-center text-paper lg:block">
          <RadarChart axes={radarAxes} />
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-ink-line/70 pt-3 sm:w-40 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-end sm:justify-start">
            <div className="sm:text-right">
              <div className="text-[10px] uppercase tracking-wide text-paper/45">List</div>
              <div className="text-sm font-semibold">{gbp(economics.wholesalePrice)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-paper/45">Profit</div>
              <div className="text-sm font-semibold text-brand-300">
                {gbp(metrics.landedProfit)}
                <span className="ml-1 text-xs font-medium text-paper/50">
                  {pct(metrics.landedRoiPct)}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
            <button
              type="button"
              onClick={() => onNegotiate(match)}
              disabled={disabled || blocked}
              className="btn-ghost px-3 py-2 text-xs"
            >
              Negotiate
            </button>
            <button
              type="button"
              onClick={() => onBuy(match)}
              disabled={disabled || blocked}
              className="btn-primary px-3 py-2 text-xs"
            >
              {blocked ? "Blocked" : "Buy"}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden border-t border-ink-line/70 px-4 pb-3 pt-0 sm:block">
        <PolicyChecks match={match} policyPass={policyPass} />
      </div>
    </div>
  );
}

function radarFor(match: ProcuredLot) {
  return [
    { label: "Fit", value: match.fitScore },
    { label: "Supplier", value: match.supplier.score },
    { label: "ROI", value: Math.min(100, Math.max(0, match.metrics.landedRoiPct)) },
    { label: "On-time", value: Math.round(match.supplier.onTimeRate * 100) },
    { label: "Decision", value: match.metrics.decisionScore }
  ];
}

function MetricPill({
  label,
  value,
  suffix = ""
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <span>
      <span className="text-paper/40">{label} </span>
      <span className="font-semibold text-paper/80">
        {value}
        {suffix}
      </span>
    </span>
  );
}

function PolicyChecks({ match, policyPass }: { match: ProcuredLot; policyPass: number }) {
  const { policy } = match;
  return (
    <details className="group mt-3 rounded-xl border border-ink-line bg-ink/30 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between text-paper/70">
        <span>
          Checks · {policyPass}/{policy.rules.length} policy
          {match.rfq
            ? ` · ${match.rfq.checks.filter((c) => c.status === "met").length}/${match.rfq.checks.length} RFQ`
            : ""}
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
