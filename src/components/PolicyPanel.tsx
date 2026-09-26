"use client";

import { DEFAULT_POLICY } from "@/lib/procurement/policy";
import type { BuyingPolicy } from "@/lib/procurement/types";
import type { Grade } from "@/lib/types";

type NumericKey = {
  [K in keyof BuyingPolicy]: BuyingPolicy[K] extends number ? K : never;
}[keyof BuyingPolicy];
type BoolKey = {
  [K in keyof BuyingPolicy]: BuyingPolicy[K] extends boolean ? K : never;
}[keyof BuyingPolicy];

interface Field {
  key: NumericKey;
  label: string;
  unit: string;
  step: number;
  /** UI value = policy value * scale. */
  scale?: number;
  offset?: number;
}

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Price",
    fields: [
      { key: "minLotPrice", label: "Min lot price", unit: "£", step: 50 },
      { key: "maxLotPrice", label: "Max lot price", unit: "£", step: 50 },
      { key: "maxPricePerPiece", label: "Max price / piece", unit: "£", step: 1 },
      { key: "maxPriceIndex", label: "Max vs market", unit: "%", step: 1, scale: 100, offset: -100 }
    ]
  },
  {
    title: "Quality & returns",
    fields: [
      { key: "minSellThrough", label: "Min sell-through", unit: "%", step: 5, scale: 100 },
      { key: "minLandedRoiPct", label: "Min landed ROI", unit: "%", step: 5 },
      { key: "minSupplierScore", label: "Min supplier score", unit: "/100", step: 5 }
    ]
  },
  {
    title: "Strategic sourcing",
    fields: [
      { key: "maxBudgetSharePct", label: "Max budget per lot", unit: "%", step: 5 },
      { key: "maxSupplierSharePct", label: "Max spend per supplier", unit: "%", step: 5 },
      { key: "maxLotsPerCategory", label: "Max lots per category", unit: "lots", step: 1 }
    ]
  },
  {
    title: "Negotiation",
    fields: [
      { key: "targetDiscountPct", label: "Opening ask below list", unit: "%", step: 1 },
      { key: "maxRounds", label: "Max rounds", unit: "", step: 1 }
    ]
  }
];

const TOGGLES: { key: BoolKey; label: string }[] = [
  { key: "autoNegotiate", label: "Auto-negotiate before buying" },
  { key: "allowEarlyPayment", label: "Offer early payment" },
  { key: "allowBundling", label: "Use volume bundles" }
];

const toUi = (f: Field, v: number) => Math.round((v * (f.scale ?? 1) + (f.offset ?? 0)) * 100) / 100;
const fromUi = (f: Field, v: number) => (v - (f.offset ?? 0)) / (f.scale ?? 1);

export function countChangedRules(policy: BuyingPolicy): number {
  return (Object.keys(DEFAULT_POLICY) as (keyof BuyingPolicy)[]).filter(
    (k) => policy[k] !== DEFAULT_POLICY[k]
  ).length;
}

export function PolicyPanel({
  policy,
  onChange,
  onApply,
  canApply
}: {
  policy: BuyingPolicy;
  onChange: (p: BuyingPolicy) => void;
  onApply: () => void;
  canApply: boolean;
}) {
  const changed = countChangedRules(policy);
  const set = <K extends keyof BuyingPolicy>(key: K, value: BuyingPolicy[K]) =>
    onChange({ ...policy, [key]: value });

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Buying policy</h2>
        <span className="chip">{changed === 0 ? "Defaults" : `${changed} changed`}</span>
      </div>
      <p className="mt-1 text-xs text-paper/55">
        Rules the agent must obey when it ranks, negotiates and buys.
      </p>

      <div className="mt-3 space-y-4">
        {GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">
              {g.title}
            </legend>
            <div className="mt-1.5 space-y-1.5">
              {g.fields.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-paper/70">{f.label}</span>
                  <span className="flex items-center gap-1">
                    {f.unit === "£" && <span className="text-paper/40">£</span>}
                    <input
                      type="number"
                      step={f.step}
                      value={toUi(f, policy[f.key])}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) set(f.key, fromUi(f, v));
                      }}
                      className="w-16 rounded-md border border-ink-line bg-ink px-2 py-1 text-right text-xs text-paper focus:border-brand-500/60 focus:outline-none"
                    />
                    {f.unit !== "£" && (
                      <span className="w-7 text-paper/40">{f.unit === "%" && f.offset ? "+%" : f.unit}</span>
                    )}
                  </span>
                </label>
              ))}
              {g.title === "Quality & returns" && (
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-paper/70">Min grade</span>
                  <select
                    value={policy.minGrade}
                    onChange={(e) => set("minGrade", e.target.value as Grade)}
                    className="w-[5.75rem] rounded-md border border-ink-line bg-ink px-2 py-1 text-xs text-paper focus:border-brand-500/60 focus:outline-none"
                  >
                    <option value="A">Grade A</option>
                    <option value="AB">Grade AB</option>
                    <option value="B">Grade B</option>
                    <option value="Mixed">Any</option>
                  </select>
                </label>
              )}
            </div>
          </fieldset>
        ))}

        <div className="space-y-1.5">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-center justify-between text-xs">
              <span className="text-paper/70">{t.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={policy[t.key]}
                onClick={() => set(t.key, !policy[t.key])}
                className={`relative h-5 w-9 rounded-full transition ${
                  policy[t.key] ? "bg-brand-500" : "bg-ink-line"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition ${
                    policy[t.key] ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_POLICY)}
          className="btn-ghost flex-1 px-3 py-2 text-xs"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          className="btn-primary flex-1 px-3 py-2 text-xs"
        >
          Re-run buy
        </button>
      </div>
    </div>
  );
}
