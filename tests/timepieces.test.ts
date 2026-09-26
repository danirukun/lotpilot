import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent } from '../src/lib/agent';
import { sanitizeRfqPatch } from '../src/lib/rfq/resolve';

test('watches and clocks retain their distinct product focus through the agent and RFQ', async () => {
  for (const category of ['watches', 'clocks']) {
    const result = await runAgent(`I sell ${category}, budget 4000 GBP`);
    assert.deepEqual(result.dna.categories, [category]);
    assert.deepEqual(result.rfq.categories, [category]);
    assert.equal(result.rfq.budget, 4000);
    assert.equal(result.wholesale?.query, `"${category}"`);
    assert.deepEqual(sanitizeRfqPatch({ categories: [category] })?.categories, [category]);
    assert.deepEqual(result.matches, []);
  }
});
