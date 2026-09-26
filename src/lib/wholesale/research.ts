import { WHOLESALE_INDEX, type WholesaleIndexEntry } from "@/data/wholesaleIndex";
import { researchAvailable, tavilySearch } from "@/lib/store/research";
import type { ResearchSource } from "@/lib/store/types";
import type { StoreDNA } from "@/lib/types";
import type { StoreProfile, Vertical } from "@/lib/store/types";
import { leadsFromHits, ragAvailable, searchWholesaleRag } from "@/lib/wholesale/search";
import type { WholesaleLead, WholesaleResearch } from "@/lib/wholesale/types";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type { WholesaleLead, WholesaleResearch } from "@/lib/wholesale/types";

const MAX_LEADS = 6;
const CACHE_VERSION = 2;
const DEFAULT_TTL_MS = Number(process.env.WHOLESALE_CACHE_TTL_MS ?? 24 * 60 * 60 * 1000);

type CacheEnvelope = {
  version: number;
  key: string;
  cachedAt: string;
  ttlMs: number;
  research: WholesaleResearch;
};

const memory = new Map<string, CacheEnvelope>();

function cacheRoot(): string {
  return process.env.WHOLESALE_CACHE_DIR?.trim() || path.join(process.cwd(), ".cache", "wholesale-research");
}

function scoreIndexEntry(entry: WholesaleIndexEntry, dna: StoreDNA, vertical?: Vertical): number {
  let score = 0;
  if (vertical && entry.verticals.includes(vertical)) score += 40;
  const catHits = entry.categories.filter((c) => dna.categories.includes(c)).length;
  score += Math.min(30, catHits * 12);
  const aesHits = entry.aesthetics.filter((a) => dna.aesthetics.includes(a)).length;
  score += Math.min(25, aesHits * 10);
  if (entry.categories.length === 0 && entry.aesthetics.length === 0) score += 8;
  return score;
}

function leadFromIndex(entry: WholesaleIndexEntry, score: number, why: string): WholesaleLead {
  return {
    name: entry.name,
    url: entry.url,
    index: "thewholesaler",
    category: entry.category,
    snippet: entry.blurb,
    why,
    score
  };
}

export function buildWholesaleQuery(dna: StoreDNA, store?: StoreProfile): string {
  const vertical = store?.vertical.label ?? "fashion";
  const style = dna.aesthetics.slice(0, 2).join(" ");
  const cats = dna.categories.slice(0, 3).join(" ");
  const brands = dna.brands.slice(0, 2).join(" ");
  return ["UK wholesale suppliers", vertical, style, cats, brands, "thewholesaler"]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cacheKey(dna: StoreDNA, store?: StoreProfile): string {
  const raw = JSON.stringify({
    a: dna.aesthetics.slice().sort(),
    c: dna.categories.slice().sort(),
    b: dna.brands.slice().sort(),
    v: store?.vertical.primary ?? null,
    loc: dna.location ?? null
  });
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

function isFresh(entry: CacheEnvelope, now = Date.now()): boolean {
  if (entry.version !== CACHE_VERSION) return false;
  const age = now - Date.parse(entry.cachedAt);
  return Number.isFinite(age) && age >= 0 && age < entry.ttlMs;
}

async function readCache(key: string): Promise<WholesaleResearch | null> {
  const mem = memory.get(key);
  if (mem && isFresh(mem)) return { ...mem.research, cached: true, cachedAt: mem.cachedAt };
  try {
    const raw = await readFile(path.join(cacheRoot(), `${key}.json`), "utf8");
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed?.research || !isFresh(parsed)) return null;
    memory.set(key, parsed);
    return { ...parsed.research, cached: true, cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
}

async function writeCache(key: string, research: WholesaleResearch): Promise<WholesaleResearch> {
  const cachedAt = new Date().toISOString();
  const clean: WholesaleResearch = {
    ...research,
    cached: false,
    cachedAt
  };
  const entry: CacheEnvelope = { version: CACHE_VERSION, key, cachedAt, ttlMs: DEFAULT_TTL_MS, research: clean };
  memory.set(key, entry);
  try {
    await mkdir(cacheRoot(), { recursive: true });
    await writeFile(path.join(cacheRoot(), `${key}.json`), JSON.stringify(entry), "utf8");
  } catch {
    /* ignore read-only fs */
  }
  return clean;
}

function whyFor(entry: WholesaleIndexEntry, dna: StoreDNA, vertical?: Vertical): string {
  const bits: string[] = [];
  if (vertical && entry.verticals.includes(vertical)) bits.push(vertical.replace(/-/g, " "));
  const cats = entry.categories.filter((c) => dna.categories.includes(c));
  if (cats.length) bits.push(cats.slice(0, 2).join(", "));
  const aes = entry.aesthetics.filter((a) => dna.aesthetics.includes(a));
  if (aes.length) bits.push(aes.slice(0, 2).join(", "));
  return bits.length ? `Matches ${bits.join(" · ")}` : "General UK wholesale directory";
}

/** Rank seeded The Wholesaler UK entries for this store DNA. */
export function matchWholesaleIndex(dna: StoreDNA, vertical?: Vertical): WholesaleLead[] {
  return WHOLESALE_INDEX.map((entry) => {
    const score = scoreIndexEntry(entry, dna, vertical);
    return leadFromIndex(entry, score, whyFor(entry, dna, vertical));
  })
    .filter((l) => l.score >= 20)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_LEADS);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Keep ?id= on The Wholesaler CGI listings — that query is the supplier identity.
    if (!/\/cgi-bin\/go\.cgi$/i.test(u.pathname)) {
      u.search = "";
    }
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString();
  } catch {
    return url;
  }
}

function mergeLeads(into: Map<string, WholesaleLead>, leads: WholesaleLead[]): void {
  for (const lead of leads) {
    const keyUrl = canonicalUrl(lead.url);
    const existing = into.get(keyUrl);
    if (!existing || lead.score > existing.score) {
      into.set(keyUrl, { ...lead, url: keyUrl });
    } else if (existing && lead.snippet && lead.snippet.length > existing.snippet.length) {
      into.set(keyUrl, { ...existing, snippet: lead.snippet });
    }
  }
}

/** Supabase RAG first, then seeded index + optional Tavily. Offline-safe without keys. */
export async function researchWholesale(
  dna: StoreDNA,
  store?: StoreProfile,
  opts: { refresh?: boolean } = {}
): Promise<WholesaleResearch> {
  const key = cacheKey(dna, store);
  if (!opts.refresh) {
    const cached = await readCache(key);
    if (cached) return cached;
  }

  const vertical = store?.vertical.primary;
  const query = buildWholesaleQuery(dna, store);
  const notes: string[] = [];
  const sources: ResearchSource[] = [];
  const leads = new Map<string, WholesaleLead>();
  let mode: WholesaleResearch["mode"] = "index";

  let usedRag = false;
  if (ragAvailable()) {
    const rag = await searchWholesaleRag(query, MAX_LEADS);
    if (rag?.hits?.length) {
      usedRag = true;
      mode = "rag";
      const ragLeads = leadsFromHits(rag.hits);
      mergeLeads(leads, ragLeads);
      for (const lead of ragLeads) sources.push({ title: lead.name, url: lead.url });
      notes.push(
        `Supabase hybrid RRF returned ${rag.hits.length} directory hits (${rag.model}: FTS + trigram + embedding).`
      );
    } else {
      notes.push("Supabase RAG returned nothing. Falling back to seeded index.");
    }
  } else {
    notes.push("No Supabase URL/key. Using the seeded The Wholesaler UK index.");
  }

  // Seeded + Tavily only fill gaps when RAG is unavailable or empty.
  if (!usedRag) {
    const seeded = matchWholesaleIndex(dna, vertical);
    mergeLeads(leads, seeded);
    if (seeded.length) notes.push(`Matched ${seeded.length} seeded directory categories.`);

    if (researchAvailable()) {
      const live = await tavilySearch(query, 7000, {
        includeDomains: ["thewholesaler.co.uk"],
        maxResults: 6
      });
      if (live?.results?.length) {
        mode = seeded.length ? "mixed" : "live";
        notes.push(`Tavily found ${live.results.length} wholesaler directory hits.`);
        for (const r of live.results) {
          if (!r.url || !r.title) continue;
          mergeLeads(leads, [
            {
              name: r.title.trim(),
              url: r.url,
              index: hostOf(r.url).includes("thewholesaler.co.uk") ? "thewholesaler" : "web",
              category: "Directory hit",
              snippet: (r.content ?? "").slice(0, 180),
              why: "Live wholesale directory search",
              score: Math.round((r.score ?? 0.5) * 100)
            }
          ]);
          sources.push({ title: r.title.trim(), url: r.url });
        }
        if (live.answer) notes.push(live.answer.slice(0, 160));
      }
    }
  }

  const ranked = [...leads.values()]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, MAX_LEADS);

  const research: WholesaleResearch = {
    query,
    leads: ranked,
    sources: sources.slice(0, 8),
    mode,
    notes
  };
  return writeCache(key, research);
}
