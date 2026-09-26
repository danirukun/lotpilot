"use client";

import { useEffect, useState } from "react";
import { LotCard, type LotCardLayout } from "@/components/LotCard";
import type { ProcuredLot } from "@/lib/procurement/types";

const STORAGE_KEY = "lotpilot-matches-layout";

export function MatchesPanel({
  matches,
  onBuy,
  onNegotiate,
  disabled
}: {
  matches: ProcuredLot[];
  onBuy: (m: ProcuredLot) => void;
  onNegotiate: (m: ProcuredLot) => void;
  disabled?: boolean;
}) {
  const [layout, setLayout] = useState<LotCardLayout>("grid");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "list" || saved === "grid") setLayout(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function choose(next: LotCardLayout) {
    setLayout(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="label-eyebrow">Matched lots</span>
          <p className="text-xs text-paper/50">
            {matches.length} supplier lot{matches.length === 1 ? "" : "s"} ranked for this buy
          </p>
        </div>
        <div
          className="inline-flex rounded-full border border-ink-line bg-ink/50 p-0.5"
          role="group"
          aria-label="Result layout"
        >
          <LayoutButton active={layout === "grid"} onClick={() => choose("grid")} label="Grid">
            <GridIcon />
          </LayoutButton>
          <LayoutButton active={layout === "list"} onClick={() => choose("list")} label="List">
            <ListIcon />
          </LayoutButton>
        </div>
      </div>

      <div className={layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "flex flex-col gap-3"}>
        {matches.map((m, idx) => (
          <LotCard
            key={m.lot.id}
            match={m}
            rank={idx}
            layout={layout}
            onBuy={onBuy}
            onNegotiate={onNegotiate}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutButton({
  active,
  onClick,
  label,
  children
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand-500 text-ink" : "text-paper/55 hover:text-paper/85"
      }`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="14" height="3" rx="1" />
      <rect x="1" y="6.5" width="14" height="3" rx="1" />
      <rect x="1" y="11" width="14" height="3" rx="1" />
    </svg>
  );
}
