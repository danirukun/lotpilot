/** Read-only integration checks through the public role against actual indexed evidence. */
import assert from "node:assert/strict";
import { getSupabase } from "../src/lib/supabase/client";
import { buildWholesaleQuery, researchWholesale } from "../src/lib/wholesale/research";
import { searchWholesaleRag } from "../src/lib/wholesale/search";
import { parseBrief } from "../src/lib/parseBrief";
async function main() {
  const db = getSupabase(); assert.ok(db);
  const { data, error } = await db.from("wholesale_documents").select("name,source_url,content,embedding,aesthetics,evidence_version").eq("evidence_version", 2);
  assert.ifError(error); assert.ok(data?.length);
  for (const row of data) {
    assert.ok(row.source_url && row.content.length > 100);
    assert.equal(row.embedding, null);
    assert.deepEqual(row.aesthetics, []);
  }
  console.log(`Public role: ${data.length} fetched source documents; no invented tags or hash vectors.`);
  for (const brief of ["Vintage denim and workwear", "Vintage Y2K sportswear and tees"]) {
    const result = await searchWholesaleRag(buildWholesaleQuery(parseBrief(brief)), 6, "clothing", true);
    assert.ok(result?.hits.length);
    assert.ok(result.hits.some(h => h.rank_fts != null));
    assert.ok(result.hits.some(h => h.rank_trgm != null));
    for (const hit of result.hits) {
      assert.equal(hit.evidence_version, 2);
      assert.match(hit.content, /vintage|secondhand/i);
      assert.equal(hit.rank_semantic, null);
      const expected = (hit.rank_fts ? 1 / (60 + hit.rank_fts) : 0) + (hit.rank_trgm ? 1 / (60 + hit.rank_trgm) : 0);
      assert.ok(Math.abs(expected - hit.rrf_score) < 1e-12, "Actual RRF formula must agree with returned ranks");
    }
    console.log(JSON.stringify({ brief, hits: result.hits.map(h => ({name:h.name,fts:h.rank_fts,fuzzy:h.rank_trgm,rrf:h.rrf_score})) }));
  }
  const miss = await searchWholesaleRag("zxqv918273nonexistent", 6, "clothing");
  assert.ok(miss); assert.equal(miss.hits.length, 0);
  const tech = await searchWholesaleRag('"denim"', 6, "electronics");
  assert.ok(tech); assert.equal(tech.hits.length, 0);
  const dna = parseBrief("Vintage denim and workwear");
  const fresh = await researchWholesale(dna, undefined, { refresh: true });
  assert.equal(fresh.mode, "rag"); assert.equal(fresh.cached, false);
  const cached = await researchWholesale(dna); assert.equal(cached.cached, true);
  assert.deepEqual(cached.leads, fresh.leads);
  console.log("PASS: source provenance, RRF formula and both ranks, vertical filter, no-match, cache and refresh.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
