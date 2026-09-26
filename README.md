# LotPilot

LotPilot reads public shop pages and retrieves wholesale supplier descriptions for independent retailers. The production flow uses live source retrieval, with source links, fetch dates and RRF ranks. It never falls back to saved shop fixtures or seeded lots.

## Current behavior

- Provide a storefront URL or a buying brief at `/demo`.
- URL analysis reads the supplied page and up to four relevant same-site links, plus public Shopify feeds where available. It extracts product categories, brands and eras; historical market/event sites request clarification.
- A budget is retained only when the retailer provides it. Missing size or budget evidence stays unknown.
- Supabase retrieves fetched supplier descriptions. Full-text and fuzzy-text rankings are fused using `1 / (60 + rank)` for each contributing list. This is **lexical RRF, not semantic embedding search**.
- Results cite supplier profiles. They do not establish current inventory, prices, grading or availability. No margin, supplier score or buying plan is invented.
- Empty search results, network failures and unsupported categories remain explicit gaps. The vape brief is unsupported and returns no sourcing recommendations.
- There is no verified inventory or commerce integration. `/api/checkout` and `/api/negotiate` return 409. Legacy demo data/helpers remain in the repository for historical unit tests but are not imported by the production buying flow or homepage.

The initial grounded index contains three fetched supplier profiles: [To Be Worn Again](https://tobewornagain.com/pages/about), [London Vintage Wholesale](https://www.londonvintagewholesale.com/) and [Vintage Wholesale Supply](https://vintagewholesalesupplyltd.com/pages/aboutus). This is a limited corpus, not comprehensive market coverage. Adding a supplier requires fetching its actual content; the list of source URLs is a crawl configuration, not a fixture result set.

## Development

Requires Node 22+.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for retrieval. Without them the app reports retrieval unavailable. Optional Google Places and Tavily keys enable additional store research; results retain their attribution.

Chat supports JSON and streamed NDJSON (`Accept: application/x-ndjson`). Refresh bypasses store and supplier caches. Store cache format is versioned; successful supplier retrieval is cached in memory for five minutes. Failures are not cached as matches.

## Indexing

Apply `supabase/migrations/` in order. The new `wholesale_grounded_search` RPC searches only `evidence_version = 2` rows with fetched source text, URL and timestamp. Legacy rows and hashed vectors are excluded. Full-text indexes use content only, not invented category/aesthetic tags. Vintage requests require explicit vintage/secondhand evidence in the text. Vertical filters run before ranking.

```sh
# Review freshly fetched documents without writing the database.
node scripts/ingest-wholesale.mjs --dry-run --output=/tmp/lotpilot-evidence.json
# With a server-only SUPABASE_SERVICE_ROLE_KEY in .env.local:
npm run ingest:wholesale
# Add a public vintage supplier source to this crawl:
node --env-file=.env.local scripts/ingest-wholesale.mjs --source=https://supplier.example/about
```

The importer stores actual supplier page text and fails on missing evidence. It does not infer styles from directory categories, synthesize supplier descriptions or embed hash vectors. Retain `scraped_at` as the fetch timestamp; a profile's claims are not independently verified stock.

## Verification and deployment

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run verify:rag
```

`verify:rag` uses the public Supabase role to verify provenance, both lexical rank lists, the RRF formula, vertical filtering, empty searches and cache behavior. It requires network access and configured Supabase values. Regression tests use explicit mocks only inside tests.

Production: https://lotpilot-ten.vercel.app. Deploy the Next.js project with Supabase public configuration. The source index migration must be applied before deploying this version; an unavailable RPC fails closed without fixtures. A future semantic retrieval implementation must use real model-versioned embeddings for both documents and queries and reindex the corpus.
