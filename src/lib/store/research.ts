import type { MapsListing, ResearchSource } from "@/lib/store/types";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}
interface TavilyResponse {
  answer?: string | null;
  results?: TavilyResult[];
}

export interface WebResearch {
  answer?: string;
  sources: ResearchSource[];
  /** Answer plus relevant snippets, for the classifier corpus. */
  text: string;
  locations: number;
  listing: MapsListing | null;
}

const MAX_SOURCES = 5;

export function researchAvailable(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

/** Tavily Search API. Returns null on any failure so callers stay offline-safe. */
export async function tavilySearch(query: string, timeoutMs = 7000): Promise<TavilyResponse | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, search_depth: "basic", max_results: MAX_SOURCES, include_answer: true })
    });
    if (!res.ok) return null;
    return (await res.json()) as TavilyResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Research the store on the open web: one Maps-oriented query, plus an
 * "about" query when we could not read the store's own page.
 */
export async function researchStore(
  name: string,
  domain: string,
  city: string | undefined,
  pageRead: boolean
): Promise<WebResearch | null> {
  const region = city ?? (/\buk\b/i.test(name) ? "" : "UK");
  const queries = [`"${name}" ${region} shop google maps reviews address`.replace(/\s+/g, " ")];
  if (!pageRead) queries.push(`What does ${name} (${domain}) sell? Store type and products`);

  const responses = (await Promise.all(queries.map((q) => tavilySearch(q)))).filter(
    (r): r is TavilyResponse => r !== null
  );
  if (responses.length === 0) return null;

  const keys = [norm(name.replace(/\b(uk|ltd|limited|shop|store)\b/gi, "")), norm(domain.split(".")[0])].filter(
    (k) => k.length >= 4
  );
  const relevant = responses
    .flatMap((r) => r.results ?? [])
    .filter((r) => r.url && r.title)
    .filter((r) => keys.some((k) => norm(`${r.title} ${r.content} ${r.url}`).includes(k)))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  // Without a result that names the store, the answer is a guess about some other business.
  if (relevant.length === 0) return null;
  const answers = responses.map((r) => r.answer?.trim()).filter((a): a is string => Boolean(a));

  const seen = new Set<string>();
  const sources: ResearchSource[] = [];
  for (const r of relevant) {
    if (seen.has(r.url!) || sources.length >= MAX_SOURCES) continue;
    seen.add(r.url!);
    sources.push({ title: r.title!.trim(), url: r.url! });
  }

  const snippets = relevant.map((r) => `${r.title}. ${r.content ?? ""}`);
  const text = [...answers, ...snippets].join("\n").slice(0, 8000);

  return {
    answer: answers[0],
    sources,
    text,
    locations: countLocations([...answers, ...relevant.map((r) => r.content ?? "")]),
    listing: parseListing(name, city, answers, relevant)
  };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const MAPS_HOST = /google\.[a-z.]+\/maps|maps\.google|maps\.app\.goo\.gl/i;
const REVIEW_HOST = /google\.|tripadvisor|yelp|mapcarta|foursquare|yell\.com/i;

const CATEGORY_TYPES: [RegExp, string][] = [
  [/\b(used|second[- ]?hand|vintage) clothing (store|shop)\b|\bthrift (store|shop)\b|\bcharity shop\b/i, "used_clothing_store"],
  [/\bclothing (store|shop|retailer)\b|\bfashion (store|boutique|retailer)\b|\bboutique\b/i, "clothing_store"],
  [/\b(shoe|footwear|sneaker|trainer) (store|shop)\b/i, "shoe_store"],
  [/\bjewel(le)?ry (store|shop)\b/i, "jewelry_store"],
  [/\b(electronics|computer|tech) (store|shop|retailer)\b/i, "electronics_store"],
  [/\b(mobile|cell) phone (store|shop|repair)\b|\bphone repair\b/i, "cell_phone_store"],
  [/\bfurniture (store|shop)\b/i, "furniture_store"],
  [/\bhome ?(goods|ware) (store|shop)\b/i, "home_goods_store"],
  [/\bbook ?(store|shop)\b/i, "book_store"],
  [/\btoy (store|shop)\b/i, "toy_store"],
  [/\bsporting goods\b|\bsports (store|shop)\b/i, "sporting_goods_store"],
  [/\bcoffee shop\b|\bcaf[eé]\b/i, "cafe"],
  [/\bbakery\b/i, "bakery"]
];

const POSTCODE = String.raw`[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}`;
const ADDRESS = new RegExp(
  String.raw`\b(\d{1,4}(?:\s*-\s*\d{1,4})?[A-Za-z]?,?\s+(?:[A-Z][\w'’.]*\s+){0,4}(?:Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Way|Place|Pl|Square|Sq|Row|Yard|Parade|Walk|Hill|Gate|Terrace|Close|Market|Arcade|Drive|Court|Broadway|[A-Z][\w'’]+)\.?(?:,\s*[A-Z][\w'’]+(?:\s+[A-Z][\w'’]+){0,2})?,?\s+${POSTCODE})(?:,\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?))?`
);

/** Pull a Maps-style listing (rating, reviews, address, categories) out of search snippets. */
export function parseListing(
  name: string,
  city: string | undefined,
  answers: string[],
  results: TavilyResult[]
): MapsListing | null {
  // Map and review sites first, so a Maps rating wins over, say, a Trustpilot score.
  const ordered = [
    ...results.filter((r) => REVIEW_HOST.test(r.url ?? "")),
    ...results.filter((r) => !REVIEW_HOST.test(r.url ?? ""))
  ];
  const texts = [...ordered.map((r) => `${r.title ?? ""}. ${r.content ?? ""}`), ...answers];

  let rating: number | undefined;
  let reviewCount: number | undefined;
  for (const t of texts) {
    const r = parseRating(t);
    if (r.rating && rating === undefined) {
      rating = r.rating;
      reviewCount = r.reviewCount;
    }
    if (rating !== undefined && reviewCount !== undefined) break;
  }

  let address: string | undefined;
  let locality: string | undefined;
  for (const t of [...answers, ...texts]) {
    const m = t.match(ADDRESS);
    if (m) {
      address = m[1].replace(/\s+/g, " ").trim() + (m[2] ? `, ${m[2]}` : "");
      locality = m[2] ?? localityOf(address);
      break;
    }
  }

  const all = texts.join(" \n ");
  const types = CATEGORY_TYPES.filter(([re]) => re.test(all)).map(([, t]) => t);

  if (rating === undefined && !address) return null;

  const mapsUrl =
    results.find((r) => MAPS_HOST.test(r.url ?? ""))?.url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, locality ?? city].filter(Boolean).join(" "))}`;

  return {
    name,
    address,
    locality: locality ?? city,
    rating,
    reviewCount,
    types: types.length ? [...types, "store"] : [],
    mapsUrl,
    source: "web-research"
  };
}

const STREET = /\b(Street|St|Road|Rd|Lane|Ln|Avenue|Ave|Way|Place|Pl|Square|Sq|Row|Yard|Parade|Walk|Hill|Gate|Terrace|Close|Drive|Court|Unit)\b/i;

/** "19-21 Argyll Street, London W1F 7TR" and "92-100 Stoke Newington Road, London, N16 7XB" both give "London". */
function localityOf(address: string): string | undefined {
  const parts = address
    .split(",")
    .map((p) => p.replace(new RegExp(POSTCODE + "$"), "").trim())
    .filter(Boolean);
  return parts
    .slice(1)
    .reverse()
    .find((p) => /^[A-Z][a-z]+(?: [A-Z][a-z]+)?$/.test(p) && !STREET.test(p));
}

/** Distinct UK postcodes across snippets that name the store: a rough count of physical sites. */
export function countLocations(texts: string[]): number {
  const codes = new Set(
    texts.flatMap((t) => t.match(new RegExp(String.raw`\b${POSTCODE}\b`, "g")) ?? []).map((c) => c.replace(/\s+/g, "").toUpperCase())
  );
  return codes.size;
}

/** Handles "4.7 (312 reviews)", "4.7 stars", "rated 4.7/5", "3.5 out of 5 57 reviews" and "312 reviews". */
export function parseRating(text: string): { rating?: number; reviewCount?: number } {
  const num = (s: string) => Number(s.replace(/,/g, ""));
  const combined = text.match(
    /\b([1-5](?:\.\d)?)(?![\d.])\s*(★|stars?|\/\s*5|out of 5)?[\s,·(-]+(?:based on\s*)?([\d,]{1,7})\s*(?:google\s+)?(?:reviews?|ratings?)\b/i
  );
  // A bare integer before "N reviews" is usually a street number, not a rating.
  if (combined && num(combined[3]) > 0 && (combined[1].includes(".") || combined[2])) {
    return { rating: num(combined[1]), reviewCount: num(combined[3]) };
  }

  const rated = text.match(/\b(?:rated|rating(?: of)?:?)\s*([1-5](?:\.\d)?)\b|\b([1-5]\.\d)\s*(?:★|stars?|\/\s*5|out of 5)/i);
  const rating = rated ? num(rated[1] ?? rated[2]) : undefined;
  const count = text.match(/\b([\d,]{1,7})\s*(?:google\s+)?reviews\b/i);
  const reviewCount = count && num(count[1]) > 0 ? num(count[1]) : undefined;
  return { rating, reviewCount: rating !== undefined ? reviewCount : undefined };
}
