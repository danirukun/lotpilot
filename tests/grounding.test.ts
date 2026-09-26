import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { extractStoreProfile } from "../src/lib/store/extract";
import { deriveDna } from "../src/lib/store/classify";
import { runAgent } from "../src/lib/agent";
import { POST as checkout } from "../src/app/api/checkout/route";

test("ATIKA main stock text and relevant linked pages supply categories and Unicode era/brand evidence", async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input); urls.push(url);
    return new Response(url.includes("atika-vintage")
      ? '<title>ATIKA Vintage</title><main><h1>Current stock</h1><p>Levi’s jeans. 90’s style jeans. Y2K baby tees. Football shirts. Sports shorts. Knitwear. Leather jackets. Shoes and bags.</p></main>'
      : '<title>ATIKA London Vintage</title><main><a href="/atika-vintage">Our vintage stock</a></main>');
  };
  try {
    const profile = await extractStoreProfile("https://www.atikalondon.co.uk/", { refresh: true });
    assert.ok(urls.some(url => url.includes("/atika-vintage")));
    for (const c of ["denim", "tees-tops", "sportswear", "knitwear", "outerwear", "footwear", "accessories"]) assert.ok(profile.dna.categories.includes(c as never), c);
    assert.ok(profile.dna.brands.includes("Levi's"));
    assert.ok(profile.dna.decades.includes("1990s"));
    assert.ok(profile.dna.decades.includes("2000s"));
    assert.equal(profile.size.bucket, "unknown");
    assert.equal(profile.dna.budget, undefined);
  } finally { globalThis.fetch = original; }
});

test("event festival is not a boho stock signal", () => {
  const dna = deriveDna({ name: "So Vintage", seo: "Swing East festival in Poplar", categories: "", catalog: "", mapsTypes: [] }, undefined, 0, "");
  assert.ok(!dna.aesthetics.includes("boho"));
});

test("unavailable storefront never substitutes a built-in profile", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  try {
    const p = await extractStoreProfile("https://gadgetgrid.co.uk/", { refresh: true });
    assert.equal(p.fetch.mode, "offline");
    assert.deepEqual(p.dna.brands, []);
  } finally { globalThis.fetch = original; }
});

test("unsupported vape brief retains explicit budget without clothing, suppliers or made-up inventory", async () => {
  const result = await runAgent("I have a vape store, budget 4000 GBP, electronic vapes and liquids");
  assert.equal(result.rfq.budget, 4000);
  assert.deepEqual(result.matches, []);
  assert.deepEqual(result.plan.lines, []);
  assert.deepEqual(result.wholesale?.leads, []);
  assert.match(result.summary, /not supported|unsupported/i);
});

test("production checkout rejects seeded IDs instead of creating mock orders", async () => {
  const response = await checkout(new Request("http://localhost/api/checkout", { method: "POST", body: JSON.stringify({ lotIds: ["lot-001"], budget: 4000 }) }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).order, undefined);
});

test("HTTP storefront follows same-host HTTPS evidence and identifies historical markets", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async input => new Response(String(input).includes("about-2")
    ? '<meta property="article:published_time" content="2014-02-15"><main>Vintage market. Vintage womenswear from 1950 – 1990. Vintage bags, shoes, accessories and homeware.</main>'
    : '<main>Next fair: June 28th 2015. Swing East festival.<a href="https://market.example.com/about-2/">About</a></main>');
  try {
    const r = await extractStoreProfile("http://market.example.com/", { refresh: true });
    assert.equal(r.businessRole, "market-event");
    assert.equal(r.freshness, "historical");
    assert.deepEqual(r.eraRanges, ["1950 – 1990"]);
    assert.ok(r.observedCategories?.includes("Homeware"));
    assert.ok(!r.dna.aesthetics.includes("boho"));
  } finally { globalThis.fetch = original; }
});

test("store fetch does not follow a redirect into a private host", async () => {
  const { fetchText } = await import("../src/lib/store/fetcher");
  const original = globalThis.fetch;
  const visited: string[] = [];
  let redirect: RequestRedirect | undefined;
  globalThis.fetch = async (input, init) => {
    visited.push(String(input));
    redirect = init?.redirect;
    return new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/internal" } });
  };
  try { assert.equal(await fetchText("https://shop.example.com"), null); assert.equal(visited.length, 1); assert.equal(redirect, "manual"); }
  finally { globalThis.fetch = original; }
});

test("clearing an explicit budget does not restore the original brief budget", async () => {
  const r = await runAgent("Vintage denim budget £2500", undefined, { rfq: { budget: null } });
  assert.equal(r.rfq.budget, undefined);
  assert.match(r.summary, /budget not provided/i);
  assert.equal(r.plan.budget, 0);
});

test("vintage furniture keeps the home vertical and cannot retrieve clothing", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://home-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const original = globalThis.fetch;
  let filter: unknown;
  globalThis.fetch = async (_input, init) => {
    filter = JSON.parse(String(init?.body)).vertical_filter;
    return Response.json([{ id: 1, source: "supplier-website", name: "Clothing only", url: "https://supplier.example/", source_url: "https://supplier.example/about", content: "Vintage denim supplier", evidence_version: 2, scraped_at: "2026-09-26", rank_fts: 1, verticals: ["clothing"] }]);
  };
  try {
    const r = await runAgent("I have a vintage furniture shop, budget 4000 GBP", undefined, { refresh: true });
    assert.equal(filter, "home");
    assert.deepEqual(r.wholesale?.leads, []);
  } finally { globalThis.fetch = original; }
});

test("an event user can confirm a current product focus without losing store context", async () => {
  const { runAgentFromDna } = await import("../src/lib/agent");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<main>Vintage market, vintage denim jeans.</main>');
  try {
    const profile = await extractStoreProfile("https://event.example.com/", { refresh: true });
    const r = await runAgentFromDna(profile.dna, undefined, profile, { rfq: { categories: ["denim"], budget: 2500 } });
    assert.match(r.wholesale!.query, /denim/);
    assert.equal(r.rfq.budget, 2500);
    assert.equal(r.store?.businessRole, "market-event");
  } finally { globalThis.fetch = original; }
});
