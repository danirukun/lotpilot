"use client";

import React from "react";

export type RadarAxis = {
  label: string;
  value: number | null;
  displayValue?: string;
};

const W = 240;
const H = 176;
const CX = W / 2;
const CY = H / 2 + 2;
const R = 52;
const LEVELS = [0.25, 0.5, 0.75, 1];

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, n)) / 100;
}

function point(i: number, n: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
}

function ringPath(n: number, scale: number): string {
  return (
    Array.from({ length: n }, (_, i) => {
      const p = point(i, n, R * scale);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

function labelPlacement(i: number, n: number): {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
} {
  const tip = point(i, n, R + 14);
  const dx = tip.x - CX;
  return {
    x: tip.x + (Math.abs(dx) < 2 ? 0 : dx > 0 ? 3 : -3),
    y: tip.y,
    anchor: Math.abs(dx) < 2 ? "middle" : dx > 0 ? "start" : "end"
  };
}

export function RadarChart({
  axes,
  className = ""
}: {
  axes: RadarAxis[];
  className?: string;
}) {
  const n = axes.length;
  if (n < 3) return null;

  const values = axes.map((a) => a.value !== null && Number.isFinite(a.value) ? clamp01(a.value) : null);
  const complete = values.every(v => v !== null);
  const shape =
    values
      .map((v, i) => {
        const p = point(i, n, R * (v ?? 0));
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`radar-chart h-full w-full ${className}`}
      role="img"
      aria-label={axes.map((a) => `${a.label} ${a.displayValue ?? (a.value === null || !Number.isFinite(a.value) ? "Not verified" : Math.round(a.value))}`).join(", ")}
    >
      {LEVELS.map((s) => (
        <path
          key={s}
          d={ringPath(n, s)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const tip = point(i, n, R);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={tip.x}
            y2={tip.y}
            stroke="currentColor"
            strokeOpacity={0.14}
            strokeWidth={1}
          />
        );
      })}
      {complete && <path
        d={shape}
        className="radar-shape"
        fill="rgba(24, 176, 97, 0.28)"
        stroke="#3fcb7c"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />}
      {values.map((v, i) => {
        if (v === null) return null;
        const p = point(i, n, R * (v ?? 0));
        return (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r={2.4}
            className="radar-dot"
            fill="#aff0c6"
            stroke="#18b061"
            strokeWidth={1}
          />
        );
      })}
      {axes.map((a, i) => {
        const { x, y, anchor } = labelPlacement(i, n);
        return (
          <text
            key={a.label}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-paper/55"
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.02em" }}
          >
            <tspan x={x} dy="-0.35em">
              {a.label}
            </tspan>
            <tspan x={x} dy="1.15em" className="fill-paper/80" style={{ fontSize: 10 }}>
              {a.displayValue ?? (a.value === null || !Number.isFinite(a.value) ? "—" : Math.round(Math.max(0, Math.min(100, a.value))))}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
