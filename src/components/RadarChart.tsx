"use client";

export type RadarAxis = {
  label: string;
  value: number;
};

const SIZE = 168;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 58;
const LEVELS = [0.25, 0.5, 0.75, 1];

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, n)) / 100;
}

function point(i: number, n: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
}

function ringPath(n: number, scale: number): string {
  return Array.from({ length: n }, (_, i) => {
    const p = point(i, n, R * scale);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function labelAnchor(i: number, n: number): "start" | "middle" | "end" {
  const angle = (-Math.PI / 2 + (i * 2 * Math.PI) / n + 2 * Math.PI) % (2 * Math.PI);
  if (angle > 0.35 && angle < Math.PI - 0.35) return "start";
  if (angle > Math.PI + 0.35 && angle < 2 * Math.PI - 0.35) return "end";
  return "middle";
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

  const values = axes.map((a) => clamp01(a.value));
  const shape = values
    .map((v, i) => {
      const p = point(i, n, R * v);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ") + " Z";

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`radar-chart h-full w-full ${className}`}
      role="img"
      aria-label={axes.map((a) => `${a.label} ${Math.round(a.value)}`).join(", ")}
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
      <path
        d={shape}
        className="radar-shape"
        fill="rgba(24, 176, 97, 0.28)"
        stroke="#3fcb7c"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const p = point(i, n, R * v);
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
        const tip = point(i, n, R + 18);
        const anchor = labelAnchor(i, n);
        return (
          <text
            key={a.label}
            x={tip.x}
            y={tip.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-paper/55"
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.02em" }}
          >
            <tspan x={tip.x} dy="-0.35em">
              {a.label}
            </tspan>
            <tspan x={tip.x} dy="1.15em" className="fill-paper/80" style={{ fontSize: 10 }}>
              {Math.round(Math.max(0, Math.min(100, a.value)))}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
