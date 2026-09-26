#!/usr/bin/env node
/**
 * Fetch actual supplier descriptions. No generated supplier copy, prices,
 * inferred aesthetic tags or fake semantic embeddings.
 * --dry-run --output=/tmp/evidence.json exports fetched evidence for review.
 * Writes require SUPABASE_SERVICE_ROLE_KEY; public keys are read-only.
 */
import { createClient } from "@supabase/supabase-js";
import { parse } from "node-html-parser";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseDirectoryEvidence } from "./directory-evidence.mjs";

const SOURCES = [
  "https://tobewornagain.com/pages/about",
  "https://www.londonvintagewholesale.com/",
  "https://vintagewholesalesupplyltd.com/pages/aboutus"
];
const DIRECTORIES = [
  { url: "https://www.thewholesaler.co.uk/suppliers/jewellery/watches/", category: "Watches", vertical: "accessories", evidencePattern: /\b(?:watches|watch|wristwatches)\b/i },
  { url: "https://www.thewholesaler.co.uk/suppliers/home_and_garden/clocks/", category: "Clocks", vertical: "home", evidencePattern: /\bclocks?\b/i }
];
const clean = text => (text || "").replace(/\s+/g, " ").trim();

async function readSource(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "LotPilot/2.0 source research" } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const root = parse(await res.text());
  const name = clean(root.querySelector('meta[property="og:site_name"]')?.getAttribute("content")) || new URL(url).hostname;
  for (const el of root.querySelectorAll("script,style,nav,header,footer,noscript,[role=navigation],.cookie-banner")) el.remove();
  const main = root.querySelector("main") ?? root.querySelector("article") ?? root.querySelector(".rte") ?? root.querySelector("body") ?? root;
  const content = main.structuredText.trim().slice(0, 30000);
  if (content.length < 100 || !/vintage|secondhand/i.test(content)) throw new Error(`${url}: insufficient supplier evidence`);
  const verticals = /clothing|jeans|tees|sportswear|denim/i.test(content) ? ["clothing"] : [];
  if (!verticals.length) throw new Error(`${url}: no supported product vertical in content`);
  return {
    source: "supplier-website", external_id: url, name, url, source_url: res.url || url,
    category: "Supplier profile", verticals, categories: [], aesthetics: [],
    content, scraped_at: new Date().toISOString(), evidence_version: 2, embedding: null
  };
}
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const output = process.argv.find(arg => arg.startsWith("--output="))?.slice(9);
  const extra = process.argv.filter(arg => arg.startsWith("--source=")).map(arg => arg.slice(9));
  const rows = [];
  // Fail the run instead of treating a partial/blocked crawl as current inventory.
  for (const url of [...new Set([...SOURCES, ...extra])]) rows.push(await readSource(url));
  for (const directory of DIRECTORIES) {
    const response = await fetch(directory.url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`${directory.url}: HTTP ${response.status}`);
    const evidence = parseDirectoryEvidence(await response.text(), directory.url, directory);
    if (!evidence.length) throw new Error(`${directory.url}: no supplier descriptions found`);
    rows.push(...evidence);
  }
  if (output) { await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(rows, null, 2)); }
  if (!dryRun) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Set Supabase URL and service role key, or use --dry-run.");
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await db.from("wholesale_documents").upsert(rows, { onConflict: "url" });
    if (error) throw error;
  }
  console.log(JSON.stringify({ dryRun, documents: rows.length, sources: rows.map(({name,source_url,content}) => ({name,source_url,characters:content.length})), model: "lexical-rrf-v2" }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
