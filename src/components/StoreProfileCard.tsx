"use client";
import type { StoreProfile } from "@/lib/store/types";
export function StoreProfileCard({ store }: { store: StoreProfile }) {
  const chips = [...new Set([...store.dna.aesthetics, ...store.dna.categories, ...store.dna.brands, ...store.dna.decades])];
  return <div className="card space-y-3 p-5">
    <div className="flex items-start gap-4">
      {store.seo.ogImage && (
        // eslint-disable-next-line @next/next/no-img-element -- public store source image
        <img src={store.seo.ogImage} alt="" className="h-20 w-24 shrink-0 rounded-xl border border-ink-line object-cover" />
      )}
      <div className="min-w-0 flex-1">
    <span className="label-eyebrow">Store profile · {store.fetch.mode === "live" ? "Public pages" : store.fetch.mode === "reader" ? "Public pages via reader" : "Unavailable"}</span>
    <h3 className="font-display text-xl">{store.name}</h3>
    <a className="text-sm text-brand-300 hover:underline" href={store.url} target="_blank" rel="noopener noreferrer">{store.domain} ↗</a>
    <p className="text-sm text-paper/70">{store.vertical.label} · {store.businessRole === "market-event" ? "Market / event" : "Storefront"} · Size {store.size.bucket} (estimate)</p>
      </div>
    </div>
    {store.freshness === "historical" && <p className="text-sm text-accent-400">Historical content. Current trading and stock are unverified.</p>}
    <div className="flex flex-wrap gap-1.5">{chips.slice(0, 6).map(chip => <span className="chip border-brand-500/30 text-brand-300" key={chip}>{chip}</span>)}{chips.length > 6 && <span className="chip">+{chips.length - 6} more in profile</span>}</div>
    <div className="grid grid-cols-3 gap-2">
      {[["Pages read", String(store.evidence?.length ?? 0)], ["Categories", String(store.dna.categories.length)], ["Eras", store.dna.decades.length ? store.dna.decades.join(" · ") : store.eraRanges?.join(" · ") || "Unverified"]].map(([label, value]) => <div key={label} className="rounded-xl border border-ink-line bg-ink/30 p-3"><span className="block text-[10px] uppercase tracking-wide text-paper/45">{label}</span><span className="mt-1 block text-sm font-semibold">{value}</span></div>)}
    </div>
    {!!store.observedCategories?.length && <p className="text-xs text-paper/65">Also observed: {store.observedCategories.join(", ")}</p>}
    {!!store.eraRanges?.length && <p className="text-xs text-paper/65">Source era ranges: {store.eraRanges.join(", ")}</p>}
    <details className="border-t border-ink-line pt-3">
      <summary className="cursor-pointer text-sm">Shop DNA &amp; stock evidence · {store.evidence?.length ?? 0} pages</summary>
      <div className="mt-3 flex flex-wrap gap-1.5">{chips.map(chip => <span className="chip" key={chip}>{chip}</span>)}</div>
      <ul className="mt-3 space-y-4">{store.evidence?.map(page => <li key={page.url}>
        <a className="text-sm text-brand-300 hover:underline" href={page.url} target="_blank" rel="noopener noreferrer">{page.title} ↗</a>
        <p className="mt-1 text-xs text-paper/70">{[...page.categories, ...page.brands, ...page.decades].join(" · ") || "No specific stock terms found"}</p>
        <p className="mt-1 text-xs text-paper/50">Read {new Date(page.fetchedAt).toLocaleDateString("en-GB")}{page.publishedDates.length ? ` · Published ${page.publishedDates.join(", ")}` : " · Publication date unknown"}</p>
        <details className="mt-1 text-xs text-paper/60"><summary className="cursor-pointer">Read extracted source text</summary><p className="mt-2 whitespace-pre-line">{page.text}</p></details>
      </li>)}</ul>
      <ul className="mt-3 space-y-1 text-xs text-paper/55">{store.fetch.notes.filter(note => !note.startsWith("Set ")).map(note => <li key={note}>{note}</li>)}</ul>
    </details>
  </div>;
}
