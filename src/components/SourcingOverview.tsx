import { gbp } from "@/lib/format";
import type { AgentResult } from "@/lib/types";

export function SourcingOverview({ result }: { result: AgentResult }) {
  const count = result.wholesale?.leads.length ?? 0;
  return <div className="card overflow-hidden border-brand-500/25">
    <div className="flex items-center justify-between gap-3 bg-brand-500/10 px-4 py-3">
      <span className="label-eyebrow">Sourcing overview</span>
      <span className="chip">{count ? "Research ready" : "More evidence needed"}</span>
    </div>
    <dl className="grid grid-cols-3 divide-x divide-ink-line px-2 py-4">
      {[["Your budget", result.rfq.budget === undefined ? "Not set" : gbp(result.rfq.budget)], ["Supplier leads", String(count)], ["Verified lots", String(result.matches.length)]].map(([label, value]) => <div className="px-3" key={label}><dt className="text-[10px] uppercase tracking-wide text-paper/50">{label}</dt><dd className="mt-1 font-display text-xl">{value}</dd></div>)}
    </dl>
    <p className="border-t border-ink-line px-4 py-3 text-xs text-paper/60">{count ? "Next: check the source profiles and confirm available lots, grades and prices with suppliers." : "Confirm your buying requirements or try a current stock page to continue."}</p>
  </div>;
}
