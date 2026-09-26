"use client";

import { KeySupplierLabel } from "@/components/SupplierScorecard";
import { gbp, pct } from "@/lib/format";
import type { SourcingPlan } from "@/lib/procurement/types";

const MIX_COLORS = ["bg-brand-500", "bg-accent-500", "bg-sky-400", "bg-fuchsia-400", "bg-paper/60"];

export function SourcingPlanCard({
  plan,
  onBuyPlan,
  disabled
}: {
  plan: SourcingPlan;
  onBuyPlan: () => void;
  disabled?: boolean;
}) {
  const empty = plan.lines.length === 0;

  return (
    <div className="card animate-fade-up p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="label-eyebrow">Strategic sourcing plan</span>
          <h3 className="mt-1 font-display text-xl">
            {empty ? "No lot clears your policy" : `Opening buy: ${plan.lines.length} lots`}
          </h3>
          <p className="text-xs text-paper/55">
            Budget {gbp(plan.budget)}
            {plan.budgetAssumed ? " (assumed)" : ""} · prices after negotiation
          </p>
        </div>
        {!empty && (
          <button onClick={onBuyPlan} disabled={disabled} className="btn-primary">
            Negotiate &amp; buy plan
          </button>
        )}
      </div>

      {!empty && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Spend" value={gbp(plan.totalSpend)} />
            <Kpi label="Budget used" value={pct(plan.budgetUtilizationPct)} />
            <Kpi label="Saved vs list" value={gbp(plan.estimatedSavings)} accent />
            <Kpi label="Landed profit" value={gbp(plan.expectedLandedProfit)} accent />
            <Kpi label="Blended ROI" value={pct(plan.blendedLandedRoiPct)} accent />
            <Kpi label="Avg supplier" value={`${plan.avgSupplierScore}/100`} />
          </dl>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-paper/45">Supplier mix</div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-ink-line">
              {plan.supplierMix.map((s, i) => (
                <div
                  key={s.name}
                  className={MIX_COLORS[i % MIX_COLORS.length]}
                  style={{ width: `${s.sharePct}%` }}
                  title={`${s.name}: ${s.sharePct}%`}
                />
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper/60">
              {plan.supplierMix.map((s, i) => (
                <span key={s.name} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${MIX_COLORS[i % MIX_COLORS.length]}`} />
                  {s.name} · {s.sharePct}%
                </span>
              ))}
            </div>
          </div>

          <table className="mt-4 w-full text-left text-xs">
            <thead className="text-paper/45">
              <tr>
                <th className="pb-1 font-medium">Lot</th>
                <th className="pb-1 text-right font-medium">List</th>
                <th className="pb-1 text-right font-medium">Target</th>
                <th className="hidden pb-1 text-right font-medium sm:table-cell">Landed profit</th>
              </tr>
            </thead>
            <tbody>
              {plan.lines.map((l) => (
                <tr key={l.lotId} className="border-t border-ink-line/70">
                  <td className="py-1.5 pr-2">
                    <span className="block text-paper/90">{l.title}</span>
                    <span className="inline-flex flex-wrap items-center gap-1.5 text-paper/45">
                      {l.wholesaler}
                      {l.supplierScore !== undefined && (
                        <span className="text-paper/55">· {l.supplierScore}/100</span>
                      )}
                      {l.rfqScore !== undefined && <span className="text-paper/55">· RFQ {l.rfqScore}%</span>}
                      {l.keySupplier && <KeySupplierLabel />}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-paper/50 line-through">{gbp(l.listPrice)}</td>
                  <td className="py-1.5 text-right font-semibold text-paper">
                    {gbp(l.estimatedPrice)}
                  </td>
                  <td className="hidden py-1.5 text-right text-brand-300 sm:table-cell">
                    {gbp(l.landedProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {plan.excluded.length > 0 && (
        <div className="mt-4 rounded-xl border border-ink-line bg-ink/40 p-3">
          <div className="text-[11px] uppercase tracking-wide text-paper/45">
            Excluded by policy &amp; sourcing rules
          </div>
          <ul className="mt-1.5 space-y-1 text-xs">
            {plan.excluded.map((e) => (
              <li key={e.lotId} className="flex gap-2">
                <span className="font-bold text-red-400">✕</span>
                <span>
                  <span className="text-paper/85">{e.title}</span>
                  <span className="text-paper/50"> · {e.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-ink-line bg-ink/50 px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-paper/45">{label}</dt>
      <dd className={`mt-0.5 text-sm font-semibold ${accent ? "text-brand-300" : "text-paper"}`}>
        {value}
      </dd>
    </div>
  );
}
