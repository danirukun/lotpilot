import "./setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildWholesaleQuery, researchWholesale } from "../src/lib/wholesale/research";
import { parseBrief } from "../src/lib/parseBrief";
import { searchWholesaleRag } from "../src/lib/wholesale/search";
import { createOrder } from "../src/lib/checkout";
import { DEFAULT_POLICY } from "../src/lib/procurement/policy";
import { LOTS } from "../src/data/lots";
import type { HybridHit } from "../src/lib/wholesale/search";

function hit(overrides: Partial<HybridHit>): HybridHit {
  return { id: 1, source: "thewholesaler", external_id: "supplier-1", name: "Denim Supplier", url: "https://example.com/denim", category: "Denim", verticals: ["clothing"], categories: ["denim"], aesthetics: ["vintage"], content: "Wholesale denim", scraped_at: "2026-09-26T12:00:00Z", rrf_score: 0.04, rank_fts: 1, rank_trgm: 2, rank_semantic: 1, ...overrides };
}

test("directory query contains alternative product terms, not mandatory boilerplate", () => {
  const query = buildWholesaleQuery(parseBrief("Vintage denim and workwear, budget £2500"));
  assert.match(query, /denim/);
  assert.match(query, / OR /);
  assert.doesNotMatch(query, /thewholesaler|UK wholesale suppliers/);
});

test("Supabase RPC transport failure degrades to directory fallback", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Network unavailable"); };
  try {
    const result = await researchWholesale(parseBrief("vintage denim"), undefined, { refresh: true });
    assert.equal(result.mode, "index");
    assert.ok(result.leads.length > 0);
    assert.ok(result.notes.some(n => /unavailable|failed/i.test(n)));
  } finally { globalThis.fetch = original; }
});

test("changing embedding configuration never queries hash index with another model", async () => {
  process.env.WHOLESALE_EMBED_MODEL = "openai";
  process.env.OPENAI_API_KEY = "test-key";
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input, init) => {
    urls.push(String(input));
    if (String(input).includes("api.openai.com")) return new Response("unavailable", { status: 503 });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.query_embedding, null, "incompatible vectors must be disabled");
    return Response.json([]);
  };
  try {
    const result = await searchWholesaleRag("denim");
    assert.equal(result?.model, "keyword-only");
    assert.ok(urls.every(url => !url.includes("api.openai.com")));
  } finally {
    globalThis.fetch = original;
    delete process.env.WHOLESALE_EMBED_MODEL;
    delete process.env.OPENAI_API_KEY;
  }
});

test("commerce environment placeholders cannot label a simulated order as live", () => {
  process.env.COMMERCE_LAYER_CLIENT_ID = "placeholder";
  process.env.COMMERCE_LAYER_ENDPOINT = "https://example.com";
  const order = createOrder([LOTS[0].id], DEFAULT_POLICY, 10000);
  assert.equal(order.source, "mock");
  delete process.env.COMMERCE_LAYER_CLIENT_ID;
  delete process.env.COMMERCE_LAYER_ENDPOINT;
});

test("directory results exclude wrong verticals, vector-only neighbours and duplicate suppliers", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([
    hit({}),
    hit({ id: 2, external_id: "supplier-2", url: "https://example.com/another-listing", name: "Denim Supplier" }),
    hit({ id: 3, name: "Phone Supplier", verticals: ["electronics"] }),
    hit({ id: 4, name: "Random neighbour", rank_fts: null, rank_trgm: null }),
    hit({ id: 5, name: "Workwear Supplier" })
  ]);
  try {
    const result = await searchWholesaleRag("denim OR workwear", 6, "clothing");
    assert.deepEqual(result?.hits.map(row => row.name), ["Denim Supplier", "Workwear Supplier"]);
  } finally { globalThis.fetch = original; }
});

test("enabling live retrieval bypasses cached offline research", async () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const dna = parseBrief("vintage denim in Leeds");
  const offline = await researchWholesale(dna, undefined, { refresh: true });
  assert.equal(offline.mode, "index");
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cache-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json([hit({})]);
  try {
    const live = await researchWholesale(dna);
    assert.equal(live.mode, "rag");
    assert.equal(live.cached, false);
    assert.equal((await researchWholesale(dna)).cached, true);
  } finally { globalThis.fetch = original; }
});

test("a transient live outage does not cache fallback results for the next request", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://recovery-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  const dna = parseBrief("denim vintage recovery test");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  try {
    assert.equal((await researchWholesale(dna, undefined, { refresh: true })).mode, "index");
    globalThis.fetch = async () => Response.json([hit({})]);
    assert.equal((await researchWholesale(dna)).mode, "rag");
  } finally { globalThis.fetch = original; }
});
