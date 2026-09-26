import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDirectoryEvidence } from '../scripts/directory-evidence.mjs';

test('directory indexing excludes navigation and unrelated suppliers', () => {
  const relevant = 'We supply wholesale watches, wrist watches and pocket watches for retailers. Contact us for current products and availability.';
  const rows = parseDirectoryEvidence(`<nav>Watches Clocks Denim</nav><div class="trader"><h2 itemprop="name">Watch Supplier</h2><a href="/suppliers/watch_supplier.php">Details</a><p itemprop="description">${relevant}</p></div><div class="trader"><h2 itemprop="name">Other Supplier</h2><a href="/suppliers/other.php">Details</a><p itemprop="description">We supply wholesale denim clothing and accessories for independent shops. Contact us for products and availability.</p></div>`, 'https://www.thewholesaler.co.uk/suppliers/jewellery/watches/', { category:'Watches', vertical:'accessories', evidencePattern:/\bwatches\b/i });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].content, relevant);
  assert.equal(rows[0].source_url, 'https://www.thewholesaler.co.uk/suppliers/jewellery/watches/');
  assert.deepEqual(rows[0].aesthetics, []);
  assert.equal(rows[0].embedding, null);
});
