/** Read-only verification through the public client, not the MCP's admin role. */
import assert from "node:assert/strict";
import { getSupabase } from "../src/lib/supabase/client";
import { buildWholesaleQuery, researchWholesale } from "../src/lib/wholesale/research";
import { searchWholesaleRag } from "../src/lib/wholesale/search";
import { hashEmbed } from "../src/lib/wholesale/embed";
import { parseBrief } from "../src/lib/parseBrief";
import type { Vertical } from "../src/lib/store/types";

async function main() {
  const db = getSupabase();
  assert.ok(db, "Configure Supabase URL and public key in .env.local");
  const { count, error } = await db.from("wholesale_documents").select("id", { count: "exact", head: true });
  assert.ifError(error);
  assert.ok(count && count > 0, "Public role must be able to read indexed documents");
  // Check actual indexed vectors against the query model, rather than trusting a label.
  const sample = await db.from("wholesale_documents").select("name,category,content,verticals,categories,aesthetics,embedding").limit(3);
  assert.ifError(sample.error);
  for (const row of sample.data ?? []) {
    const expected = hashEmbed([row.name, row.category, row.content, ...row.verticals, ...row.categories, ...row.aesthetics].join(" "));
    const actual = typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding;
    assert.equal(actual?.length, 1536);
    assert.ok(expected.every((value, i) => Math.abs(value - actual[i]) < 0.000002), "Index and query vector model must agree");
  }
  console.log(`Public read access: ${count} indexed documents; sampled vectors match local-hash-v1.`);

  const checks: Array<{ brief: string; vertical: Vertical; query?: string }> = [
    { brief: "Y2K thrift shop, tees and denim, £2000 budget", vertical: "clothing" },
    { brief: "Vintage denim and workwear, £2500 budget", vertical: "clothing" },
    { brief: "Retro football shirts, adidas sportswear", vertical: "clothing" },
    { brief: "Electronics", vertical: "electronics", query: "smartphones OR laptops OR computers OR electronics" }
  ];
  for (const check of checks) {
    const query = check.query ?? buildWholesaleQuery(parseBrief(check.brief));
    const started = Date.now();
    const result = await searchWholesaleRag(query, 6, check.vertical);
    assert.ok(result?.hits.length, `No indexed results for ${check.brief}`);
    assert.ok(result.hits.every(hit => hit.verticals.includes(check.vertical)), "Cross-vertical result");
    assert.ok(result.hits.some(hit => hit.rank_fts !== null), "Full-text search must contribute");
    assert.ok(result.hits.some(hit => hit.rank_semantic !== null), "Keyword vectors must contribute");
    console.log(JSON.stringify({ query, ms: Date.now() - started, hits: result.hits.map(hit => ({ name: hit.name, keywordRank: hit.rank_fts, fuzzyRank: hit.rank_trgm, vectorRank: hit.rank_semantic })) }));
  }
  const miss = await searchWholesaleRag("zxqv918273nonexistent", 6, "clothing");
  assert.ok(miss);
  assert.equal(miss.hits.length, 0, "Nonsense must not return arbitrary vector neighbours");
  const dna = parseBrief("Vintage denim and workwear, £2500 budget");
  const fresh = await researchWholesale(dna, undefined, { refresh: true });
  assert.equal(fresh.mode, "rag");
  assert.equal(fresh.cached, false);
  const cached = await researchWholesale(dna);
  assert.equal(cached.mode, "rag");
  assert.equal(cached.cached, true);
  assert.deepEqual(cached.leads, fresh.leads);
  console.log("PASS: indexed retrieval, model parity, full-text contribution, vertical relevance, no-match and cache/refresh.");
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
