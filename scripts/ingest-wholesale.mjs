#!/usr/bin/env node
/**
 * Crawl The Wholesaler UK clothing/electronics categories and upsert into
 * Supabase wholesale_documents with local-hash-v1 embeddings.
 *
 * Writes require NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * --dry-run crawls without database writes; --limit=N limits category pages.
 *
 * Usage: node scripts/ingest-wholesale.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { parse } from "node-html-parser";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UA = "LotPilotBot/1.0 (+https://lotpilot.vercel.app; wholesale index research)";
const EMBED_DIM = 1536;

const CATEGORY_META = {
  babywear: { category: "Childrenswear", verticals: ["clothing"], categories: ["tees-tops", "dresses"], aesthetics: ["vintage"] },
  boutique_wear: { category: "Boutique", verticals: ["clothing"], categories: ["dresses", "outerwear"], aesthetics: ["minimal", "preppy"] },
  branded_clothing: { category: "Branded clothing", verticals: ["clothing"], categories: ["tees-tops", "denim", "outerwear"], aesthetics: ["streetwear", "y2k"] },
  casual_wear: { category: "Casual wear", verticals: ["clothing"], categories: ["tees-tops", "denim", "knitwear"], aesthetics: ["streetwear", "minimal"] },
  character_clothing: { category: "Character clothing", verticals: ["clothing"], categories: ["tees-tops"], aesthetics: ["y2k"] },
  childrens_wear: { category: "Childrenswear", verticals: ["clothing"], categories: ["tees-tops", "dresses"], aesthetics: [] },
  countrywear: { category: "Countrywear", verticals: ["clothing", "sports-outdoor"], categories: ["outerwear", "knitwear"], aesthetics: ["gorpcore"] },
  dancewear: { category: "Dancewear", verticals: ["clothing", "sports-outdoor"], categories: ["sportswear"], aesthetics: ["athleisure"] },
  designer_labels: { category: "Designer", verticals: ["clothing"], categories: ["dresses", "outerwear", "denim"], aesthetics: ["minimal", "preppy"] },
  ethnic_and_fair_trade_clothes: { category: "Fair trade", verticals: ["clothing"], categories: ["dresses", "tees-tops"], aesthetics: ["boho"] },
  evening_wear: { category: "Evening wear", verticals: ["clothing"], categories: ["dresses"], aesthetics: ["preppy"] },
  ex_chainstore_and_catalogue: {
    category: "Ex-chainstore",
    verticals: ["clothing"],
    categories: ["tees-tops", "denim", "dresses", "outerwear"],
    aesthetics: ["vintage", "y2k", "streetwear"]
  },
  footwear: { category: "Footwear", verticals: ["footwear", "clothing"], categories: ["footwear"], aesthetics: ["streetwear", "sportswear", "y2k"] },
  garment_display: { category: "Retail fixtures", verticals: ["general"], categories: [], aesthetics: [] },
  hats_and_headwear: { category: "Accessories", verticals: ["accessories", "clothing"], categories: ["accessories"], aesthetics: ["streetwear", "vintage"] },
  hosiery_and_underwear: { category: "Hosiery", verticals: ["clothing", "accessories"], categories: ["accessories"], aesthetics: [] },
  jeans: { category: "Denim", verticals: ["clothing"], categories: ["denim"], aesthetics: ["vintage", "streetwear", "y2k"] },
  knitwear: { category: "Knitwear", verticals: ["clothing"], categories: ["knitwear"], aesthetics: ["vintage", "minimal"] },
  ladies_wear: { category: "Ladieswear", verticals: ["clothing"], categories: ["dresses", "tees-tops", "outerwear"], aesthetics: ["vintage", "y2k", "minimal"] },
  lingerie: { category: "Lingerie", verticals: ["clothing"], categories: [], aesthetics: [] },
  manufacturers: { category: "Manufacturers", verticals: ["clothing"], categories: ["tees-tops", "denim"], aesthetics: [] },
  menswear: { category: "Menswear", verticals: ["clothing"], categories: ["tees-tops", "denim", "outerwear"], aesthetics: ["streetwear", "minimal", "vintage"] },
  nightwear: { category: "Nightwear", verticals: ["clothing"], categories: [], aesthetics: [] },
  occasion_wear: { category: "Occasion wear", verticals: ["clothing"], categories: ["dresses"], aesthetics: ["preppy"] },
  organic_clothing: { category: "Organic", verticals: ["clothing"], categories: ["tees-tops", "knitwear"], aesthetics: ["minimal", "boho"] },
  outerwear: { category: "Outerwear", verticals: ["clothing"], categories: ["outerwear"], aesthetics: ["gorpcore", "streetwear", "vintage"] },
  plus_size_clothing: { category: "Plus size", verticals: ["clothing"], categories: ["dresses", "tees-tops"], aesthetics: [] },
  scarves: { category: "Accessories", verticals: ["accessories", "clothing"], categories: ["accessories"], aesthetics: ["vintage", "boho"] },
  schoolwear: { category: "Schoolwear", verticals: ["clothing"], categories: [], aesthetics: ["preppy"] },
  sportswear: {
    category: "Sportswear",
    verticals: ["clothing", "sports-outdoor"],
    categories: ["sportswear", "tees-tops"],
    aesthetics: ["sportswear", "athleisure", "streetwear"]
  },
  swimwear: { category: "Swimwear", verticals: ["clothing"], categories: [], aesthetics: [] },
  thermal_clothing: { category: "Thermal", verticals: ["clothing", "sports-outdoor"], categories: ["outerwear", "knitwear"], aesthetics: ["gorpcore"] },
  workwear: { category: "Workwear", verticals: ["clothing"], categories: ["outerwear"], aesthetics: [] },
  football: {
    category: "Football",
    verticals: ["sports-outdoor", "clothing"],
    categories: ["sportswear", "tees-tops"],
    aesthetics: ["football", "sportswear", "vintage"]
  },
  sports_goods: { category: "Sports", verticals: ["sports-outdoor"], categories: ["sportswear", "footwear"], aesthetics: ["sportswear", "gorpcore"] },
  mobile_phone: { category: "Electronics", verticals: ["electronics"], categories: ["smartphones", "cables-accessories"], aesthetics: [] },
  computers: { category: "Electronics", verticals: ["electronics"], categories: ["laptops", "tablets", "cables-accessories"], aesthetics: [] },
  gadgets: {
    category: "Electronics",
    verticals: ["electronics"],
    categories: ["headphones", "gaming", "refurb-mixed", "cables-accessories"],
    aesthetics: []
  }
};

const EXTRA = [
  "https://www.thewholesaler.co.uk/clothing-wholesale/",
  "https://www.thewholesaler.co.uk/trade-directory/",
  "https://www.thewholesaler.co.uk/suppliers/hobbies_and_pastimes/football/",
  "https://www.thewholesaler.co.uk/suppliers/hobbies_and_pastimes/sports_goods/",
  "https://www.thewholesaler.co.uk/suppliers/electronics_and_communications/mobile_phone/",
  "https://www.thewholesaler.co.uk/suppliers/electronics_and_communications/computers/",
  "https://www.thewholesaler.co.uk/suppliers/electronics_and_communications/gadgets/"
];

function hashEmbed(text, dim = EMBED_DIM) {
  const v = new Float64Array(dim);
  const tokens = String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  for (const t of tokens) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
    const idx = h % dim;
    v[idx] += 1;
    v[(idx + 31) % dim] += 0.5;
    v[(idx + 97) % dim] += 0.25;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(v, (x) => Number((x / norm).toFixed(6)));
}

function slugFromUrl(url) {
  const m = url.match(/\/([^/]+)\/?$/);
  return m ? m[1] : "page";
}
function abs(href, base) {
  try {
    return new URL(href, base).toString().replace(":443/", "/");
  } catch {
    return null;
  }
}
function clean(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function titleCase(slug) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function metaFor(url) {
  const slug = slugFromUrl(url);
  return CATEGORY_META[slug] || { category: titleCase(slug), verticals: ["clothing"], categories: ["tees-tops"], aesthetics: [] };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(String(res.status));
  return await res.text();
}

function extract(html, pageUrl) {
  const root = parse(html);
  const meta = metaFor(pageUrl);
  const slug = slugFromUrl(pageUrl);
  const title = clean(root.querySelector("title")?.text || "");
  const desc = clean(root.querySelector("meta[name=description]")?.getAttribute("content") || "");
  const h1 = clean(root.querySelector("h1")?.text || "");
  const paras = root
    .querySelectorAll("p")
    .slice(0, 10)
    .map((p) => clean(p.text))
    .filter((t) => t.length > 40);
  const name = h1 || titleCase(slug);
  const content = [title, h1, desc, ...paras].filter(Boolean).join("\n").slice(0, 5000);
  const docs = [
    {
      source: "thewholesaler",
      external_id: `cat-${slug}`,
      name: `${name} wholesalers`,
      url: pageUrl.replace(/\/$/, ""),
      category: meta.category,
      verticals: meta.verticals,
      categories: meta.categories,
      aesthetics: meta.aesthetics,
      content: content || `${name} UK wholesale suppliers on The Wholesaler UK.`
    }
  ];
  const seen = new Set();
  for (const a of root.querySelectorAll("a")) {
    const href = a.getAttribute("href") || "";
    const text = clean(a.text);
    if (!href || !text || text.length < 2 || text.length > 90) continue;
    if (/^(more details|add to favorites|home|categories|sectors|trade shows|advertise|about|news|touch to view|business sectors)/i.test(text))
      continue;
    const full = abs(href, pageUrl);
    if (!full || !full.includes("thewholesaler.co.uk")) continue;
    const listing = full.match(/\/([a-z0-9_]+)_(\d+)\.php/i);
    const cgi = full.match(/go\.cgi\?id=(\d+)/i);
    if (!listing && !cgi) continue;
    const id = listing ? listing[2] : cgi[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const detailUrl = listing ? full.split("#")[0] : `https://www.thewholesaler.co.uk/cgi-bin/go.cgi?id=${id}`;
    docs.push({
      source: "thewholesaler",
      external_id: `supplier-${id}`,
      name: text,
      url: detailUrl,
      category: meta.category,
      verticals: meta.verticals,
      categories: meta.categories,
      aesthetics: meta.aesthetics,
      content: `${text} is a UK wholesale supplier listed under ${meta.category} (${slug.replace(/_/g, " ")}) on The Wholesaler UK directory.`
    });
  }
  return docs;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
  if (!(limit > 0) || (limit !== Infinity && !Number.isInteger(limit))) throw new Error("--limit must be a positive integer");
  const output = process.argv.find(arg => arg.startsWith("--output="))?.slice("--output=".length);
  if (process.env.WHOLESALE_EMBED_MODEL && process.env.WHOLESALE_EMBED_MODEL !== "local-hash-v1") {
    throw new Error("This index uses local-hash-v1. Re-embedding requires a model-versioned index; unset WHOLESALE_EMBED_MODEL.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!dryRun && (!url || !key)) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use --dry-run. Public keys are read-only.");
    process.exit(1);
  }
  const supabase = !dryRun ? createClient(url, key, { auth: { persistSession: false } }) : null;

  const clothingIndex = "https://www.thewholesaler.co.uk/clothing-wholesale/";
  const html = await fetchHtml(clothingIndex);
  const root = parse(html);
  const catUrls = [...new Set(root.querySelectorAll("a").map((a) => a.getAttribute("href") || ""))]
    .map((h) => abs(h, clothingIndex))
    .filter((u) => u && /\/suppliers\/clothing_and_fashion\/[a-z0-9_]+\/?$/i.test(u));
  const urls = [...new Set([...catUrls, ...EXTRA])].slice(0, limit);
  console.log("crawling", urls.length, "pages");

  const byKey = new Map();
  let failures = 0;
  for (const pageUrl of urls) {
    try {
      const page = await fetchHtml(pageUrl);
      const docs = extract(page, pageUrl);
      console.log(slugFromUrl(pageUrl), docs.length);
      for (const d of docs) {
        const k = d.external_id;
        if (!byKey.has(k)) byKey.set(k, d);
        else {
          const prev = byKey.get(k);
          prev.verticals = [...new Set([...(prev.verticals || []), ...(d.verticals || [])])];
          prev.categories = [...new Set([...(prev.categories || []), ...(d.categories || [])])];
          prev.aesthetics = [...new Set([...(prev.aesthetics || []), ...(d.aesthetics || [])])];
          if ((d.content || "").length > (prev.content || "").length) prev.content = d.content;
        }
      }
    } catch (e) {
      failures++;
      console.log("FAIL", pageUrl, e.message);
    }
  }

  const rows = [...byKey.values()].map((d) => {
    const blob = [d.name, d.category, d.content, ...(d.verticals || []), ...(d.categories || []), ...(d.aesthetics || [])].join(" ");
    return {
      ...d,
      embedding: hashEmbed(blob),
      scraped_at: new Date().toISOString()
    };
  });

  if (!rows.length) throw new Error("The crawl produced no documents; nothing was written.");
  if (output) {
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(rows, null, 2));
  }
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, pages: urls.length, failures, documents: rows.length, suppliers: rows.filter(row => row.external_id.startsWith("supplier-")).length, model: "local-hash-v1", sample: rows.slice(0, 3).map(({ name, url }) => ({ name, url })) }, null, 2));
    if (failures) process.exitCode = 1;
    return;
  }
  if (failures) throw new Error(`${failures} pages failed; refusing a partial ingest. Retry the crawl.`);

  for (let i = 0; i < rows.length; i += 20) {
    const chunk = rows.slice(i, i + 20);
    const { error } = await supabase.from("wholesale_documents").upsert(chunk, { onConflict: "url" });
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log("upserted", i, "-", i + chunk.length);
  }
  console.log("done", rows.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
