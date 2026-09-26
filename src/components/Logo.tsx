export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-onbrand shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path d="M3 20 12 4l9 16-9-4-9 4Z" fill="currentColor" className="text-onbrand" />
        </svg>
      </span>
      <span className="text-lg tracking-tight text-paper">
        Lot<span className="text-brand-400">Pilot</span>
      </span>
    </span>
  );
}
