"use client";
import type { StoreProfile } from "@/lib/store/types";
export function StoreProfileCard({ store }: { store: StoreProfile }) {
  const chips = [...store.dna.aesthetics, ...store.dna.categories, ...store.dna.brands, ...store.dna.decades];
  return <div className="card space-y-3 p-5">
    <span className="label-eyebrow">Store profile · {store.fetch.mode === "live" ? "Public pages" : "Unavailable"}</span>
    <h3 className="font-display text-xl">{store.name}</h3>
    <a className="text-sm text-brand-300 hover:underline" href={store.url} target="_blank" rel="noopener noreferrer">{store.domain} ↗</a>
    <p className="text-sm text-paper/70">{store.vertical.label} · {store.businessRole === "market-event" ? "Market / event" : "Storefront"} · Size {store.size.bucket} (estimate)</p>
    {store.freshness === "historical" && <p className="text-sm text-accent-400">Historical content. Current trading and stock are unverified.</p>}
    <div className="flex flex-wrap gap-1.5">{chips.map(chip => <span className="chip" key={chip}>{chip}</span>)}</div>
    {!!store.observedCategories?.length && <p className="text-xs text-paper/65">Also observed: {store.observedCategories.join(", ")}</p>}
    {!!store.eraRanges?.length && <p className="text-xs text-paper/65">Source era ranges: {store.eraRanges.join(", ")}</p>}
    <details className="border-t border-ink-line pt-3">
      <summary className="cursor-pointer text-sm">Stock evidence · {store.evidence?.length ?? 0} pages</summary>
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
