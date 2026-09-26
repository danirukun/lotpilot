import { fetchJson } from "@/lib/store/fetcher";
import type { CatalogData } from "@/lib/store/types";

interface ShopifyCollections {
  collections?: { title?: string; products_count?: number }[];
}
interface ShopifyProducts {
  products?: { product_type?: string; tags?: string[] | string; vendor?: string }[];
}

const PAGE = 250;
const MAX_PAGES = 4;
export const MAX_CATEGORIES = 16;
const JUNK =
  /^(all|frontpage|home ?page|home|sale|new|new in|new arrivals|best ?sellers?|gift ?cards?|featured|trending|clearance|shop|view all|shop all|see all)$/i;
const JUNK_PARTS =
  /\b(search|test|hidden|do not|dont|don't|draft|copy of|landing|klaviyo|google|facebook|instagram|feed|discount|eligible|final sale|sale|clearance|gifts?|under|upsell|cart|friends and family|bestsellers?|best sellers?|collection|promo|bundle|exclusive|limited|members?|wholesale|outlet|b2b|bulk|ordering|favou?rites?|new arrivals|shop the look|lookbook)\b|[$£€%]/i;
const GENDER_PREFIX = /^(men'?s|women'?s|mens|womens|kids'?|unisex)\s+/i;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Drop junk collection names: numbers, search pages, "All ..." roll-ups, brand repeats. */
export function cleanCategories(names: string[], brand?: string, limit = MAX_CATEGORIES): string[] {
  const brandKey = brand ? norm(brand) : "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const stripped = raw.replace(/\s+/g, " ").trim().replace(GENDER_PREFIX, "");
    const name = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    const key = norm(name);
    if (!key || seen.has(key)) continue;
    if (name.length > 32 || name.split(" ").length > 4 || /^[\d\s.,#-]+$/.test(name) || !/\p{L}{2}/u.test(name)) continue;
    if (JUNK.test(name) || JUNK_PARTS.test(name) || /^all\b/i.test(name)) continue;
    if (brandKey.length >= 3 && key.includes(brandKey)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, limit);
}

/** Shopify exposes public collection and product feeds; read them for categories and size. */
export async function readShopifyCatalog(origin: string, brand?: string): Promise<CatalogData | null> {
  const collections = await fetchJson<ShopifyCollections>(`${origin}/collections.json?limit=${PAGE}`);

  const products: NonNullable<ShopifyProducts["products"]> = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchJson<ShopifyProducts>(`${origin}/products.json?limit=${PAGE}&page=${page}`);
    const batch = data?.products ?? [];
    products.push(...batch);
    if (batch.length < PAGE) break;
  }

  if (!collections?.collections && products.length === 0) return null;
  return fromShopifyFeeds(collections ?? {}, { products }, brand);
}

export function fromShopifyFeeds(collections: ShopifyCollections, feed: ShopifyProducts, brand?: string): CatalogData {
  const products = feed.products ?? [];
  const all = collections.collections ?? [];
  const stocked = all.filter((c) => (c.products_count ?? 0) > 0);
  const pool = (stocked.length > 0 ? stocked : all)
    .slice()
    .sort((a, b) => (b.products_count ?? 0) - (a.products_count ?? 0))
    .map((c) => c.title ?? "");
  const meaningful = cleanCategories(pool, brand);
  const meaningfulCount = cleanCategories(pool, brand, Infinity).length;

  const terms = products.flatMap((p) => [
    p.product_type ?? "",
    p.vendor ?? "",
    ...(Array.isArray(p.tags) ? p.tags : (p.tags ?? "").split(","))
  ]);

  return {
    categories: meaningful,
    productTerms: terms.map((t) => t.trim()).filter(Boolean),
    productCount: products.length || undefined,
    productCountCapped: products.length >= PAGE * MAX_PAGES,
    collectionCount: meaningfulCount || undefined
  };
}
