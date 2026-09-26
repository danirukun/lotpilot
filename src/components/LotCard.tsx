"use client";

import { ScoreBar } from "@/components/ScoreBar";
import { gbp, pct } from "@/lib/format";
import type { LotScore } from "@/lib/types";

export function LotCard({
  match,
  rank,
  onConfirm,
  disabled
}: {
  match: LotScore;
  rank: number;
  onConfirm: (match: LotScore) => void;
  disabled?: boolean;
}) {
  const { lot, economics } = match;
  const isTop = rank === 0;

  return (
    <div
      className={`card animate-fade-up overflow-hidden ${
        isTop ? "ring-1 ring-brand-500/50" : ""
      }`}
    >
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lot.image} alt={lot.title} className="h-36 w-full object-cover" loading="lazy" />
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
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">Grade {lot.grade}</span>
          <span className="chip">{lot.pieceCount} pcs</span>
          {lot.aesthetics.slice(0, 2).map((a) => (
            <span key={a} className="chip capitalize">
              {a}
            </span>
          ))}
        </div>

        <h3 className="mt-3 font-semibold leading-tight">{lot.title}</h3>
        <p className="text-xs text-paper/55">{lot.wholesaler}</p>

        <ul className="mt-3 space-y-1 text-xs text-paper/70">
          {match.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-0.5 text-brand-400">▸</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ScoreBar label="Fit" value={match.fitScore} />
          <ScoreBar label="Margin" value={match.marginScore} tone="accent" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-ink-line bg-ink/50 p-3 text-center">
          <Metric label="Wholesale" value={gbp(economics.wholesalePrice)} />
          <Metric label="Est. profit" value={gbp(economics.projectedProfit)} accent />
          <Metric label="ROI" value={pct(economics.roiPct)} accent />
        </div>

        <button
          type="button"
          onClick={() => onConfirm(match)}
          disabled={disabled}
          className="btn-primary mt-4 w-full"
        >
          Confirm &amp; buy for {gbp(economics.wholesalePrice)}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-paper/45">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${accent ? "text-brand-300" : "text-paper"}`}>
        {value}
      </div>
    </div>
  );
}
