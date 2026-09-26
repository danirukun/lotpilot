export function ScoreBar({
  label,
  value,
  tone = "brand"
}: {
  label: string;
  value: number;
  tone?: "brand" | "accent";
}) {
  const width = Math.max(0, Math.min(100, value));
  const bar = tone === "accent" ? "bg-accent-500" : "bg-brand-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-paper/60">
        <span>{label}</span>
        <span className="font-semibold text-paper/80">{width}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-line">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
