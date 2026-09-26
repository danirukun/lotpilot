import { findFixture } from "@/data/storeFixtures";
import { cleanCategories, fromShopifyFeeds, readShopifyCatalog } from "@/lib/store/catalog";
import { deriveElectronicsCategories } from "@/lib/catalog";
import { classifyVertical, deriveDna, estimateSize, isFashion, VERTICAL_LABEL, type Corpus } from "@/lib/store/classify";
import { fetchText, normalizeUrl } from "@/lib/store/fetcher";
import { parsePage, type ParsedPage } from "@/lib/store/html";
import { findMapsListing, listingFromJsonLd, mapsAvailable } from "@/lib/store/maps";
import { researchAvailable, researchStore } from "@/lib/store/research";
import type { CatalogData, MapsListing, StoreProfile, StoreSignal } from "@/lib/store/types";

const EMPTY_CATALOG: CatalogData = { categories: [], productTerms: [], productCountCapped: false };

export function nameFromDomain(domain: string): string {
  const handle = domain
    .replace(/^www\./, "")
    .replace(/\.myshopify\.com$/, "")
    .split(".")[0];
  return handle
    .replace(/and/g, " & ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "Beyond Retro | Vintage Fashion Retailer" becomes "Beyond Retro". */
export function cleanName(raw: string | undefined): string | undefined {
  const first = raw
    ?.split(/\s[|–—-]\s|:\s|\s[|–—]|[|–—]\s/)
    .map((p) => p.trim())
    .find(Boolean);
  return first && first.length <= 60 ? first : undefined;
}

/** Prefer a brand-sized name over a long marketing title. */
export function resolveStoreName(parsed: ParsedPage | null, domain: string): string {
  const stem = domain.replace(/^www\./, "").split(".")[0];
  const og = cleanName(parsed?.seo.ogSiteName);
  if (og) return og;

  const business = cleanName(parsed?.business?.name);
  if (business) return business;

  const title = parsed?.seo.title;
  if (title) {
    const parts = title
      .split(/\s[|–—]\s|:\s/)
      .map((p) => p.trim())
      .filter(Boolean);
    const brandPart = [...parts].reverse().find((p) => p.length <= 28 && normToken(p).includes(normToken(stem)));
    if (brandPart) return brandPart.length <= 40 ? brandPart : cleanName(brandPart) ?? brandPart;
    const shortBrand = [...parts].reverse().find((p) => p.length <= 16 && /^[A-Z0-9]/.test(p));
    if (shortBrand && parts.length > 1) return shortBrand;
    const cleaned = cleanName(title);
    if (cleaned && normToken(cleaned).includes(normToken(stem))) return cleaned;
  }

  return nameFromDomain(domain);
}

const normToken = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export async function extractStoreProfile(input: string): Promise<StoreProfile> {
  const url = normalizeUrl(input);
  if (!url) throw new Error("Enter a public store URL, e.g. neonrewind.co.uk");

  const domain = url.hostname.replace(/^www\./, "");
  const origin = url.origin;
  const notes: string[] = [];
  const fixture = findFixture(domain);

  let mode: StoreProfile["fetch"]["mode"] = "offline";
  let parsed: ParsedPage | null = null;
  let catalog: CatalogData = EMPTY_CATALOG;

  // Live-first: hit the real storefront when the network allows. Fixtures are fallback only.
  const html = await fetchText(url.toString());
  if (html) {
    mode = "live";
    parsed = parsePage(html, domain);
    notes.push("Fetched the live landing page.");
  } else if (fixture) {
    mode = "fixture";
    parsed = parsePage(fixture.html, domain);
    notes.push("Live page unreachable. Using the built-in demo snapshot for HTML and catalog.");
  } else {
    notes.push(
      `Could not fetch the landing page. Profile uses the store name${researchAvailable() ? " and web research" : ""} only.`
    );
  }

  const name = resolveStoreName(parsed, domain);
  const locality = parsed?.business?.locality;

  if (mode === "live" && parsed?.platform === "shopify") {
    catalog = (await readShopifyCatalog(origin, name)) ?? EMPTY_CATALOG;
    if (catalog.productCount) notes.push("Read the public Shopify collection and product feeds.");
  } else if (mode === "fixture" && fixture?.shopify) {
    catalog = fromShopifyFeeds({ collections: fixture.shopify.collections }, { products: fixture.shopify.products }, name);
  }

  if (parsed && catalog.categories.length === 0) {
    const nav = cleanCategories(parsed.navCategories, name);
    catalog = { ...catalog, categories: nav, collectionCount: nav.length || undefined };
  }

  // Real APIs whenever keys are set — including demo/fixture domains for the live hackathon path.
  const useResearch = researchAvailable();
  const [placesListing, research] = await Promise.all([
    mapsAvailable() ? findMapsListing([name, locality].filter(Boolean).join(" ")) : Promise.resolve(null),
    useResearch ? researchStore(name, domain, locality, Boolean(parsed)) : Promise.resolve(null)
  ]);

  let maps: MapsListing | null = placesListing;
  if (mapsAvailable()) {
    notes.push(maps ? "Matched a Google Maps listing via the Places API." : "No Google Maps listing matched.");
  }
  // Snapshot Maps win over Tavily guesses when the page itself came from a fixture.
  if (!maps && mode === "fixture" && fixture?.maps) {
    maps = fixture.maps;
    notes.push("Location listing taken from the demo snapshot.");
  }
  if (!maps && research?.listing) {
    maps = research.listing;
    notes.push("Built the location listing from web research snippets (Tavily). Check it before you rely on it.");
  }
  if (!maps) {
    maps = listingFromJsonLd(parsed?.business ?? null, name);
    if (maps) notes.push("Used the store's own structured data (JSON-LD) for the location listing.");
  }
  if (useResearch) {
    notes.push(research ? `Web research (Tavily) found ${research.sources.length} sources.` : "Web research (Tavily) returned nothing.");
  }
  if (!maps && !mapsAvailable() && mode !== "fixture") {
    notes.push(
      researchAvailable()
        ? "No location listing found. Set GOOGLE_MAPS_API_KEY for a direct Google Maps lookup."
        : "Set GOOGLE_MAPS_API_KEY or TAVILY_API_KEY to look up the Google Maps listing."
    );
  }

  const seo = parsed?.seo ?? { keywords: [], jsonLdTypes: [] };
  const corpus: Corpus = {
    name: `${name} ${domain.replace(/[.-]/g, " ")}`,
    seo: [seo.title, seo.description, seo.ogTitle, seo.ogDescription, seo.twitterDescription, seo.keywords.join(" "), seo.jsonLdTypes.join(" ")]
      .filter(Boolean)
      .join(" "),
    categories: catalog.categories.join(" · "),
    catalog: catalog.productTerms.join(" "),
    mapsTypes: maps?.types ?? [],
    research: research?.text
  };

  const vertical = classifyVertical(corpus);
  // Fixture pages keep their own site count; Tavily postcode hits must not inflate demo size.
  const locations = Math.min(
    10,
    Math.max(parsed?.business?.locations ?? 1, mode === "fixture" ? 0 : (research?.locations ?? 0))
  );
  const size = estimateSize(catalog, maps, locations);
  const place = maps?.locality ?? locality;
  const fashionFit = isFashion(vertical.primary) || vertical.primary === "general";

  let dnaDraft = deriveDna(corpus, place, size.suggestedBudget, "");
  if (vertical.primary === "electronics") {
    const techBrands = ["Apple", "Samsung", "Sony", "Dell", "HP", "Google", "Microsoft", "Nintendo", "OnePlus", "JBL"];
    const blob = [corpus.name, corpus.seo, corpus.categories, corpus.catalog].join(" ").toLowerCase();
    dnaDraft = {
      ...dnaDraft,
      aesthetics: [],
      categories: deriveElectronicsCategories(corpus),
      brands: techBrands.filter((b) => blob.includes(b.toLowerCase())).slice(0, 6)
    };
  }
  const brief = composeBrief(name, place, VERTICAL_LABEL[vertical.primary], size.label, catalog.categories, dnaDraft.aesthetics, size.suggestedBudget);
  const dna = { ...dnaDraft, brief };

  const signals: StoreSignal[] = [
    { source: "name", label: "Store name", value: name },
    ...(parsed ? [{ source: "platform" as const, label: "Platform", value: parsed.platform }] : []),
    ...(seo.title ? [{ source: "seo" as const, label: "Title tag", value: seo.title }] : []),
    ...(seo.description ?? seo.ogDescription
      ? [{ source: "seo" as const, label: "Meta description", value: (seo.description ?? seo.ogDescription)! }]
      : []),
    ...(seo.keywords.length ? [{ source: "seo" as const, label: "Keywords", value: seo.keywords.slice(0, 8).join(", ") }] : []),
    ...(seo.jsonLdTypes.length ? [{ source: "seo" as const, label: "Schema.org types", value: seo.jsonLdTypes.join(", ") }] : []),
    ...(catalog.categories.length
      ? [{ source: "categories" as const, label: "Categories", value: catalog.categories.slice(0, 8).join(", ") }]
      : []),
    ...(catalog.productCount
      ? [{ source: "catalog" as const, label: "Products", value: `${catalog.productCount}${catalog.productCountCapped ? "+" : ""}` }]
      : []),
    ...(maps
      ? [
          {
            source: "maps" as const,
            label: "Maps listing",
            value: [maps.name, maps.address, maps.rating && `${maps.rating}★ (${maps.reviewCount ?? 0})`]
              .filter(Boolean)
              .join(" · ")
          }
        ]
      : []),
    ...(research
      ? [
          {
            source: "research" as const,
            label: "Web research",
            value: research.answer ?? `${research.sources.length} sources found`
          }
        ]
      : [])
  ];

  return {
    url: url.toString(),
    domain,
    name,
    platform: parsed?.platform ?? "unknown",
    seo,
    catalog: { ...catalog, productTerms: catalog.productTerms.slice(0, 40) },
    maps,
    research: research ? { answer: research.answer, sources: research.sources } : null,
    vertical: { ...vertical, label: VERTICAL_LABEL[vertical.primary] },
    size,
    fashionFit,
    dna,
    brief,
    signals,
    fetch: { mode, notes }
  };
}

function composeBrief(
  name: string,
  place: string | undefined,
  vertical: string,
  sizeLabel: string,
  categories: string[],
  aesthetics: string[],
  budget: number
): string {
  const parts = [
    `${name}${place ? ` in ${place}` : ""}: ${vertical.toLowerCase()} store, ${sizeLabel.split(" · ")[0].toLowerCase()} size.`,
    categories.length ? `Sells ${categories.slice(0, 5).join(", ")}.` : "",
    aesthetics.length ? `Style: ${aesthetics.join(", ")}.` : "",
    `Suggested opening budget £${budget.toLocaleString("en-GB")}.`
  ];
  return parts.filter(Boolean).join(" ");
}
