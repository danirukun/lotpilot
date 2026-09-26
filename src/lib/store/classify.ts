import { AESTHETIC_KEYWORDS, BRAND_DICTIONARY, CATEGORY_KEYWORDS, normalizeStockText } from "@/lib/parseBrief";
import type { CatalogData, MapsListing, SizeBucket, Vertical, VerticalScore } from "@/lib/store/types";
import type { Category, StoreDNA } from "@/lib/types";

export const VERTICAL_LABEL: Record<Vertical, string> = {
  clothing: "Clothing & apparel",
  footwear: "Footwear",
  accessories: "Accessories & jewellery",
  electronics: "Electronics",
  home: "Home & furniture",
  beauty: "Beauty & personal care",
  "books-media": "Books & media",
  "toys-games": "Toys & games",
  "sports-outdoor": "Sports & outdoor",
  "food-drink": "Food & drink",
  general: "General merchandise"
};

const VERTICAL_KEYWORDS: Record<Exclude<Vertical, "general">, string[]> = {
  clothing: ["clothing", "clothes", "apparel", "fashion", "denim", "jeans", "dress", "tee", "t-shirt", "shirt", "jacket", "coat", "knitwear", "hoodie", "womenswear", "menswear", "boutique", "streetwear", "workwear"],
  footwear: ["shoe", "shoes", "sneaker", "trainer", "boots", "footwear", "sandals"],
  accessories: ["jewellery", "jewelry", "watch", "watches", "handbag", "bags", "sunglasses", "scarf", "accessories"],
  electronics: ["electronics", "phone", "smartphone", "laptop", "headphones", "earbuds", "charger", "tablet", "camera", "gaming pc", "console", "tech", "gadget", "refurbished", "usb"],
  home: ["clock", "furniture", "homeware", "home decor", "kitchen", "lighting", "sofa", "rug", "candle", "interiors"],
  beauty: ["beauty", "skincare", "cosmetics", "makeup", "fragrance", "haircare", "salon"],
  "books-media": ["books", "bookshop", "vinyl", "records", "comics", "magazines"],
  "toys-games": ["toys", "board games", "lego", "puzzles", "kids toys"],
  "sports-outdoor": ["cycling", "bike", "fitness equipment", "camping", "climbing", "golf", "fishing"],
  "food-drink": ["coffee", "bakery", "deli", "grocery", "wine", "tea", "chocolate", "restaurant", "cafe"]
};

const MAPS_TYPE_VERTICAL: Record<string, Vertical> = {
  clothing_store: "clothing",
  used_clothing_store: "clothing",
  womens_clothing_store: "clothing",
  mens_clothing_store: "clothing",
  shoe_store: "footwear",
  jewelry_store: "accessories",
  electronics_store: "electronics",
  cell_phone_store: "electronics",
  home_goods_store: "home",
  furniture_store: "home",
  beauty_salon: "beauty",
  book_store: "books-media",
  toy_store: "toys-games",
  sporting_goods_store: "sports-outdoor",
  bakery: "food-drink",
  cafe: "food-drink",
  grocery_store: "food-drink"
};

const FASHION: Vertical[] = ["clothing", "footwear", "accessories"];

export interface Corpus {
  name: string;
  seo: string;
  categories: string;
  catalog: string;
  mapsTypes: string[];
  /** Third-party web research snippets; weighted low because they may describe other shops. */
  research?: string;
  content?: string;
}

const WEIGHTS = { name: 1.5, seo: 1.5, categories: 2, catalog: 0.4, research: 0.5 };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Prefix match by default ("knit" hits "knitwear"); whole words plus plurals when strict ("deli" misses "delivery"). */
const countTerm = (text: string, kw: string, strict = false) =>
  (text.match(new RegExp(`\\b${escape(kw)}${strict ? "(?:s|es)?\\b" : ""}`, "gi")) ?? []).length;

function weightedHits(corpus: Corpus, keywords: string[], strict = false): number {
  const count = (text: string, kw: string) => countTerm(normalizeStockText(text), kw, strict);
  return keywords.reduce(
    (sum, kw) =>
      sum +
      count(corpus.name, kw) * WEIGHTS.name +
      count(corpus.seo, kw) * WEIGHTS.seo +
      count(corpus.categories, kw) * WEIGHTS.categories +
      Math.min(6, count(corpus.content ?? "", kw)) * 1.5 +
      Math.min(10, count(corpus.catalog, kw)) * WEIGHTS.catalog +
      Math.min(6, count(corpus.research ?? "", kw)) * WEIGHTS.research,
    0
  );
}

export function classifyVertical(corpus: Corpus): {
  primary: Vertical;
  confidence: number;
  scores: VerticalScore[];
} {
  const scores = (Object.keys(VERTICAL_KEYWORDS) as Exclude<Vertical, "general">[]).map((v) => ({
    vertical: v as Vertical,
    score:
      weightedHits(corpus, VERTICAL_KEYWORDS[v], true) +
      corpus.mapsTypes.filter((t) => MAPS_TYPE_VERTICAL[t] === v).length * 6
  }));
  // Vintage is an era/condition across furniture, records and clothing.
  // Use it as a clothing hint only if no product vertical is established.
  if (scores.every(s => s.score === 0)) scores[0].score = weightedHits(corpus, ["vintage", "thrift"], true);
  scores.sort((a, b) => b.score - a.score);
  const total = scores.reduce((s, x) => s + x.score, 0);
  const top = scores[0];
  if (!top || top.score === 0) return { primary: "general", confidence: 0, scores: [] };
  return {
    primary: top.vertical,
    confidence: Math.round((top.score / total) * 100) / 100,
    scores: scores.filter((s) => s.score > 0).map((s) => ({ ...s, score: Math.round(s.score * 10) / 10 }))
  };
}

export const isFashion = (v: Vertical) => FASHION.includes(v);

const BUDGET_BY_SIZE: Record<Exclude<SizeBucket, "unknown">, { label: string; range: [number, number]; suggested: number }> = {
  micro: { label: "Micro · 1 person or market stall", range: [500, 1500], suggested: 1000 },
  small: { label: "Small · single indie shop", range: [1500, 5000], suggested: 2500 },
  medium: { label: "Medium · established shop or 2-3 sites", range: [5000, 20000], suggested: 8000 },
  large: { label: "Large · multi-site or high-volume online", range: [20000, 80000], suggested: 25000 }
};

/** Points per signal, 0..3, averaged over the signals we actually have. */
export function estimateSize(
  catalog: CatalogData,
  maps: MapsListing | null,
  locations: number
): { bucket: SizeBucket; label: string; drivers: string[]; suggestedBudget?: number; budgetRange?: [number, number] } {
  const points: number[] = [];
  const drivers: string[] = [];
  const tier = (v: number, cuts: [number, number, number]) => (v < cuts[0] ? 0 : v < cuts[1] ? 1 : v < cuts[2] ? 2 : 3);

  if (catalog.productCount) {
    points.push(tier(catalog.productCount, [60, 250, 900]));
    drivers.push(`${catalog.productCount}${catalog.productCountCapped ? "+" : ""} products listed`);
  }
  const collections = catalog.collectionCount ?? catalog.categories.length;
  if (collections > 0) {
    // Big stores create many merchandising collections, so this signal alone never proves "large".
    points.push(Math.min(2, tier(collections, [5, 15, 40])));
    drivers.push(`${collections} stocked collections`);
  }
  // Web-research counts mix review platforms, so only Maps-grade listings drive size.
  if (maps?.reviewCount && maps.source !== "web-research") {
    points.push(tier(maps.reviewCount, [50, 400, 2000]));
    drivers.push(`${maps.reviewCount.toLocaleString("en-GB")} Google reviews`);
  }
  if (locations > 1) {
    points.push(Math.min(3, locations));
    drivers.push(`${locations} physical locations`);
  }

  if (points.length === 0) return { bucket: "unknown", label: "Unknown · no reliable size evidence", drivers: ["Size and buying budget are not established by the available sources."] };
  const avg = points.length ? points.reduce((a, b) => a + b, 0) / points.length : 0.5;
  const bucket: SizeBucket = avg < 0.75 ? "micro" : avg < 1.5 ? "small" : avg < 2.25 ? "medium" : "large";
  const b = BUDGET_BY_SIZE[bucket];
  return { bucket, label: b.label, drivers, suggestedBudget: b.suggested, budgetRange: b.range };
}

const topKeys = (counts: Map<string, number>, n: number, min = 1) =>
  [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);

/** Store DNA from weighted keyword counts across every extracted source. */
export function deriveDna(corpus: Corpus, locality: string | undefined, budget: number | undefined, brief: string): StoreDNA {
  const aesthetics = new Map<string, number>();
  for (const [key, kws] of Object.entries(AESTHETIC_KEYWORDS)) {
    const hits = weightedHits(corpus, kws);
    if (hits > 0) aesthetics.set(key, hits);
  }
  const categories = new Map<string, number>();
  for (const [key, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const hits = weightedHits(corpus, kws);
    if (hits > 0) categories.set(key, hits);
  }
  const all = normalizeStockText([corpus.name, corpus.seo, corpus.categories, corpus.catalog, corpus.content ?? ""].join(" ")).toLowerCase();
  const brands = BRAND_DICTIONARY.filter((b) => new RegExp(`\\b${escape(b.toLowerCase())}(?![a-z])`).test(all));
  const decades = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s"].filter(
    (d) => all.includes(d) || new RegExp(`\\b${d.slice(2, 4)}s\\b`).test(all)
  );
  const topAesthetics = topKeys(aesthetics, 12, 1.5);
  if (topAesthetics.includes("y2k") && !decades.includes("2000s")) decades.push("2000s");

  return {
    brief,
    aesthetics: topAesthetics,
    categories: topKeys(categories, 16, 1.5) as Category[],
    brands: brands.slice(0, 6),
    decades,
    budget,
    location: locality
  };
}
