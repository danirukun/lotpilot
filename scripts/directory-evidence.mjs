import { parse } from 'node-html-parser';

const clean = text => (text || '').replace(/\s+/g, ' ').trim();

/** Only individual trader descriptions count as evidence, never directory navigation. */
export function parseDirectoryEvidence(html, sourceUrl, { category, vertical, evidencePattern }) {
  const root = parse(html);
  return root.querySelectorAll('.trader').flatMap(trader => {
    const name = clean(trader.querySelector('[itemprop=name]')?.text);
    const content = clean(trader.querySelector('[itemprop=description]')?.text);
    const detail = trader.querySelector('a[href*=".php"]')?.getAttribute('href');
    if (!name || content.length < 100 || !evidencePattern.test(content) || !detail) return [];
    const url = new URL(detail, sourceUrl);
    if (url.origin !== new URL(sourceUrl).origin) return [];
    return [{ source: 'thewholesaler', external_id: url.pathname, name, url: url.toString(),
      source_url: sourceUrl, category, verticals: [vertical], categories: [], aesthetics: [],
      content, scraped_at: new Date().toISOString(), evidence_version: 2, embedding: null }];
  });
}
