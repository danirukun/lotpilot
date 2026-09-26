import './setup';
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractStoreProfile } from '../src/lib/store/extract';

test('blocked storefront uses attributed real reader content and retries failed reads', async () => {
  const original = globalThis.fetch;
  const visited: string[] = [];
  globalThis.fetch = async input => {
    const url = String(input); visited.push(url);
    return url.startsWith('https://r.jina.ai/')
      ? new Response('<html><head><title>Classic Football Shirts</title></head><body><main>Vintage football shirts, Adidas sportswear and retro jerseys from the 90s.</main></body></html>')
      : new Response('Blocked', { status: 403 });
  };
  try {
    const p = await extractStoreProfile('https://shirts.example.com/', { refresh: true });
    assert.equal(p.fetch.mode, 'reader');
    assert.match(p.fetch.notes.join(' '), /Jina/);
    assert.match(p.evidence![0].text, /football shirts/);
    assert.equal(p.evidence![0].url, 'https://shirts.example.com/');
    assert.ok(p.dna.categories.includes('sportswear'));
    globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
    assert.equal((await extractStoreProfile('https://retry.example.com/')).fetch.mode, 'offline');
    globalThis.fetch = async () => new Response('<main>Vintage denim jeans</main>');
    assert.equal((await extractStoreProfile('https://retry.example.com/')).fetch.mode, 'live');
  } finally { globalThis.fetch = original; }
});

test('reader challenge pages never become store evidence', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><title>Attention Required! | Cloudflare</title><body>Verify you are human</body></html>');
  try {
    const p = await extractStoreProfile('https://challenge.example.com/', { refresh: true });
    assert.equal(p.fetch.mode, 'offline');
    assert.deepEqual(p.evidence, []);
  } finally { globalThis.fetch = original; }
});

 test('football clubs, USA teams and polo shirts do not imply nightlife or Americana', async () => {
  const { deriveDna } = await import('../src/lib/store/classify');
  const dna = deriveDna({ name: 'Football Shirts', seo: '', categories: '', catalog: '', mapsTypes: [], content: 'Football clubs. Collectors club. USA football shirts. Polo shirts.' }, undefined, undefined, '');
  assert.ok(dna.aesthetics.includes('football'));
  for (const style of ['clubwear', 'americana', 'preppy']) assert.ok(!dna.aesthetics.includes(style));
});
