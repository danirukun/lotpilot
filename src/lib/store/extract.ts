import { findFixture } from "@/data/storeFixtures";
import { cleanCategories, fromShopifyFeeds, readShopifyCatalog } from "@/lib/store/catalog";
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

function nameFromSeo(parsed: ParsedPage | null): string | undefined {
  return cleanName(parsed?.seo.ogSiteName) ?? cleanName(parsed?.business?.name) ?? cleanName(parsed?.seo.title);
}

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

  if (fixture) {
    mode = "fixture";
    parsed = parsePage(fixture.html, domain);
    notes.push("Demo store: page and catalog served from a built-in snapshot.");
  } else {
    const html = await fetchText(url.toString());
    if (html) {
      mode = "live";
      parsed = parsePage(html, domain);
    } else {
      notes.push("Could not fetch the landing page. Profile uses the store name and web research only.");
    }
  }

  const name = nameFromSeo(parsed) ?? nameFromDomain(domain);
  const locality = parsed?.business?.locality;

  if (fixture?.shopify) {
    catalog = fromShopifyFeeds({ collections: fixture.shopify.collections }, { products: fixture.shopify.products }, name);
  } else if (!fixture && parsed?.platform === "shopify") {
    catalog = (await readShopifyCatalog(origin, name)) ?? EMPTY_CATALOG;
    if (catalog.productCount) notes.push("Read the public Shopify collection and product feeds.");
  }

  if (parsed && catalog.categories.length === 0) {
    const nav = cleanCategories(parsed.navCategories, name);
    catalog = { ...catalog, categories: nav, collectionCount: nav.length || undefined };
  }

  // Fixtures skip web research so the demo stays deterministic.
  const useResearch = !fixture && researchAvailable();
  const [placesListing, research] = await Promise.all([
    mapsAvailable() ? findMapsListing([name, locality].filter(Boolean).join(" ")) : Promise.resolve(null),
    useResearch ? researchStore(name, domain, locality, Boolean(parsed)) : Promise.resolve(null)
  ]);

  let maps: MapsListing | null = placesListing;
  if (mapsAvailable()) {
    notes.push(maps ? "Matched a Google Maps listing via the Places API." : "No Google Maps listing matched.");
  }
  if (!maps && fixture?.maps) maps = fixture.maps;
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
  if (!maps && !mapsAvailable() && !fixture) {
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
  const locations = Math.min(10, Math.max(parsed?.business?.locations ?? 1, research?.locations ?? 0));
  const size = estimateSize(catalog, maps, locations);
  const place = maps?.locality ?? locality;
  const fashionFit = isFashion(vertical.primary) || vertical.primary === "general";

  const dnaDraft = deriveDna(corpus, place, size.suggestedBudget, "");
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
