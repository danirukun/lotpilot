"use client";

import { gbp } from "@/lib/format";
import type { MapsListing, StoreProfile } from "@/lib/store/types";

const MODE_LABEL: Record<StoreProfile["fetch"]["mode"], string> = {
  live: "Live fetch",
  fixture: "Demo snapshot",
  offline: "Offline"
};

const MAPS_SOURCE_LABEL: Record<MapsListing["source"], string> = {
  "google-places": "Google Places",
  "web-research": "Web research",
  "json-ld": "Store JSON-LD",
  fixture: "Demo snapshot"
};

const PLATFORM_LABEL: Record<StoreProfile["platform"], string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  squarespace: "Squarespace",
  wix: "Wix",
  bigcommerce: "BigCommerce",
  unknown: "Unknown platform"
};

const SIZE_STEPS: StoreProfile["size"]["bucket"][] = ["micro", "small", "medium", "large"];

const VERTICAL_SHORT: Record<string, string> = {
  clothing: "Clothing",
  footwear: "Footwear",
  accessories: "Accessories",
  electronics: "Electronics",
  home: "Home",
  beauty: "Beauty",
  "books-media": "Books & media",
  "toys-games": "Toys & games",
  "sports-outdoor": "Sports & outdoor",
  "food-drink": "Food & drink",
  general: "General"
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function StoreProfileCard({ store }: { store: StoreProfile }) {
  const { seo, vertical, size, maps, dna, catalog, research } = store;
  const topScores = vertical.scores.slice(0, 3);
  const maxScore = topScores[0]?.score || 1;
  const confidence = Math.round(vertical.confidence * 100);
  const description = seo.description ?? seo.ogDescription ?? seo.twitterDescription;
  const dnaChips = [
    ...dna.aesthetics.map((a) => ({ text: a, tone: "brand" as const })),
    ...dna.categories.map((c) => ({ text: c, tone: "plain" as const })),
    ...dna.brands.map((b) => ({ text: b, tone: "accent" as const })),
    ...dna.decades.map((d) => ({ text: d, tone: "plain" as const }))
  ];

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex gap-4 p-5">
        {seo.ogImage && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary third-party OG hosts
          <img
            src={seo.ogImage}
            alt=""
            className="hidden h-20 w-32 shrink-0 rounded-xl border border-ink-line object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="label-eyebrow">Store profile</span>
          <h3 className="mt-1 truncate font-display text-xl">{store.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <a
              href={store.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-300 hover:underline"
            >
              {store.domain} ↗
            </a>
            <span className="chip py-0.5">{PLATFORM_LABEL[store.platform]}</span>
            <span
              className={`chip py-0.5 ${
                store.fetch.mode === "live"
                  ? "border-brand-500/40 text-brand-200"
                  : store.fetch.mode === "fixture"
                    ? "border-accent-500/40 text-accent-400"
                    : "text-paper/55"
              }`}
            >
              {MODE_LABEL[store.fetch.mode]}
            </span>
          </div>
        </div>
      </div>

      {!store.fashionFit && store.vertical.primary !== "electronics" && (
        <div className="mx-5 mb-4 rounded-xl border border-accent-500/40 bg-accent-500/10 px-3 py-2 text-xs text-accent-400">
          This looks like {/^[aeiou]/i.test(vertical.label) ? "an" : "a"} {vertical.label.toLowerCase()} store. The
          wholesale catalog is secondhand fashion, so matches below are weak.
        </div>
      )}
      {!store.fashionFit && store.vertical.primary === "electronics" && (
        <div className="mx-5 mb-4 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
          Electronics store — ranking refurbished tech wholesale lots (phones, laptops, audio, accessories).
        </div>
      )}

      <div className="grid gap-3 px-5 sm:grid-cols-3">
        <Tile title="Vertical">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-paper">{vertical.label}</span>
            <span className="text-xs text-paper/55">{confidence}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-line">
            <div
              className={`h-full rounded-full ${store.fashionFit ? "bg-brand-500" : "bg-accent-500"}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
          {topScores.length > 0 ? (
            <ul className="mt-2.5 space-y-1">
              {topScores.map((s) => (
                <li key={s.vertical} className="flex items-center gap-2 text-[11px] text-paper/60">
                  <span className="w-20 shrink-0 truncate">{VERTICAL_SHORT[s.vertical] ?? s.vertical}</span>
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-line">
                    <span
                      className="block h-full rounded-full bg-paper/40"
                      style={{ width: `${Math.round((s.score / maxScore) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 text-right tabular-nums">{s.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-paper/45">No vertical keywords found.</p>
          )}
        </Tile>

        <Tile title="Size estimate">
          <div className="text-sm font-semibold capitalize text-paper">{size.bucket}</div>
          <div className="text-[11px] text-paper/55">{size.label.split(" · ")[1] ?? size.label}</div>
          <div className="mt-2 flex gap-1">
            {SIZE_STEPS.map((step, i) => (
              <span
                key={step}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= SIZE_STEPS.indexOf(size.bucket) ? "bg-brand-500" : "bg-ink-line"
                }`}
              />
            ))}
          </div>
          <ul className="mt-2 space-y-0.5 text-[11px] text-paper/60">
            {size.drivers.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] text-paper/55">
            Budget {gbp(size.budgetRange[0])}–{gbp(size.budgetRange[1])} ·{" "}
            <span className="font-semibold text-brand-300">{gbp(size.suggestedBudget)} suggested</span>
          </div>
        </Tile>

        <Tile title="Maps listing">
          {maps ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-paper">{maps.name}</span>
                <span className="chip shrink-0 px-2 py-0.5 text-[10px]">{MAPS_SOURCE_LABEL[maps.source]}</span>
              </div>
              {(maps.rating !== undefined || maps.reviewCount !== undefined) && (
                <div className="mt-1 text-xs text-paper/80">
                  {maps.rating !== undefined && (
                    <>
                      <span className="text-accent-400">★</span> {maps.rating.toFixed(1)}
                    </>
                  )}
                  {maps.reviewCount !== undefined && (
                    <span className="text-paper/50">
                      {maps.rating !== undefined ? " · " : ""}
                      {maps.reviewCount.toLocaleString("en-GB")} reviews
                    </span>
                  )}
                </div>
              )}
              {maps.address && <div className="mt-1 text-[11px] leading-snug text-paper/60">{maps.address}</div>}
              {maps.mapsUrl && (
                <a
                  href={maps.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-[11px] text-brand-300 hover:underline"
                >
                  Open in Google Maps ↗
                </a>
              )}
            </>
          ) : (
            <p className="text-[11px] text-paper/45">No location listing found.</p>
          )}
        </Tile>
      </div>

      {(seo.title || description) && (
        <div className="mx-5 mt-3 rounded-xl border border-ink-line bg-ink/40 p-3">
          <div className="text-[10px] uppercase tracking-wide text-paper/45">Search snippet</div>
          <div className="mt-1 text-[11px] text-paper/45">{hostOf(seo.canonical ?? store.url)}</div>
          {seo.title && <div className="truncate text-sm text-brand-200">{seo.title}</div>}
          {description && <p className="mt-0.5 line-clamp-2 text-xs text-paper/65">{description}</p>}
        </div>
      )}

      <div className="space-y-3 p-5">
        {catalog.categories.length > 0 && (
          <ChipRow label="Categories">
            {catalog.categories.map((c) => (
              <span key={c} className="chip py-0.5">
                {c}
              </span>
            ))}
          </ChipRow>
        )}

        <ChipRow label="Extracted DNA">
          {dnaChips.map((c) => (
            <span
              key={`${c.tone}-${c.text}`}
              className={`chip py-0.5 ${
                c.tone === "brand"
                  ? "border-brand-500/40 text-brand-200"
                  : c.tone === "accent"
                    ? "border-accent-500/40 text-accent-400"
                    : ""
              }`}
            >
              {c.text}
            </span>
          ))}
          {dna.location && <span className="chip py-0.5">📍 {dna.location}</span>}
          {dnaChips.length === 0 && !dna.location && (
            <span className="text-xs text-paper/45">No fashion DNA found.</span>
          )}
        </ChipRow>

        <details className="group rounded-xl border border-ink-line bg-ink/40 px-3 py-2">
          <summary className="cursor-pointer list-none text-xs font-medium text-paper/75">
            <span className="inline-block transition group-open:rotate-90">›</span> Signals &amp; sources (
            {store.signals.length + (research?.sources.length ?? 0)})
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {store.signals.map((s, i) => (
              <li key={`${s.label}-${i}`} className="flex gap-2">
                <span className="w-28 shrink-0 text-paper/45">{s.label}</span>
                <span className="min-w-0 break-words text-paper/80">{s.value}</span>
              </li>
            ))}
          </ul>
          {research && research.sources.length > 0 && (
            <div className="mt-3 border-t border-ink-line pt-2">
              <div className="text-[10px] uppercase tracking-wide text-paper/45">Web research sources</div>
              <ul className="mt-1 space-y-1 text-xs">
                {research.sources.map((s) => (
                  <li key={s.url} className="truncate">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-300 hover:underline">
                      {s.title}
                    </a>
                    <span className="text-paper/40"> · {hostOf(s.url)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>

        {store.fetch.notes.length > 0 && (
          <ul className="space-y-0.5 text-[11px] text-paper/45">
            {store.fetch.notes.map((n) => (
              <li key={n}>ⓘ {n}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink/50 p-3">
      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-paper/45">{title}</div>
      {children}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-wide text-paper/45">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
