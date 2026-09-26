# PR #4 demo verification and live-data audit

Verified 26 September 2026 on `cursor/wholesale-rag-rrf-adf9` against Supabase project `lmfvzuvhwvjpdfkoqqvc`. Production verification was read-only. No migrations, inventory writes, orders or supplier messages were sent.

## What is live

| Surface | Evidence and limits |
| --- | --- |
| Supplier retrieval | Production Supabase contains 125 directory documents, including 85 supplier records. All 125 have full-text indexes and vectors. The app reads them with a public key under SELECT-only RLS. |
| Hybrid search | Full-text, trigram and hashed keyword vectors contribute through reciprocal rank fusion. These are lexical vectors, not semantic embeddings. Three sampled stored vectors were recomputed and matched the query model. |
| Storefront analysis | MAXGRG was fetched live, classified as clothing, then matched to six production-index leads. Public HTML and Shopify feeds require no paid keys. |
| Chat progress | Server stages stream while work runs: profile, requirements, matching, directory research and briefing. No timer invents the stages. JSON clients remain supported. |
| Supplier briefing | Both the deterministic briefing and optional LLM receive retrieved leads. Numbered source links, listing type and indexed date appear in the research card. Leads are not inventory or evidence of available stock. |
| Directory crawler | Repaired ES module entry point. A two-page dry run fetched seven documents, including five suppliers, without database writes. Writes require a server-side service-role key; public write policies are never needed. |

## Fixtures and simulations

| Location | Status / path to live data |
| --- | --- |
| `src/data/lots.ts` | 43 fashion and 8 electronics demo lots. Live purchasable lots need a supplier inventory feed with prices, grades, quantities and stock availability. Directory listings do not provide that contract. |
| `src/data/suppliers.ts`, `supplierScorecards.ts` | Seeded logistics, negotiation floors and quality/performance estimates. Require supplier contracts and actual delivery/quality history. |
| `src/data/benchmarks.ts` | Illustrative resale and market comparables; require a real pricing dataset. |
| `src/data/purchaseHistory.ts` | Persona-specific sample order history; require retailer authentication and an order-history integration. |
| `src/data/personas.ts` | Presentation presets. Classic Football Shirts and MAXGRG point to real sites; the remaining shops are examples. |
| `src/data/storeFixtures.ts` | Neon Rewind, Loom & Rivet and GadgetGrid snapshots. Used when live fetch fails; fixture mode is retained in the profile. GadgetGrid was verified as a fixture with live electronics supplier research. |
| `src/data/wholesaleIndex.ts` | Saved directory categories for offline fallback. Used when live retrieval is unavailable or has no relevant hits. |
| `src/lib/procurement/negotiation.ts` | Deterministic supplier conversation simulation. Real negotiation requires an authorised supplier communication/API channel. |
| `src/lib/checkout.ts` | Always returns a mock order. Previously, merely setting Commerce Layer variables mislabelled the result as live; fixed. UI says no payment or supplier order was sent. |
| `src/lib/analytics.ts` | Development console stub without a PostHog key; with a key it sends capture requests directly. No analytics key was available, so delivery was not verified. |
| LLM, Tavily, Google Places | Implemented optional integrations; credentials were unavailable in this session, so their live paths were not verified. |

## Repeatable checks

Requires Node 22+ (the installed Supabase client requires it), dependencies installed, and `.env.local` with the public Supabase URL/key. Never commit service-role or optional provider keys.

```sh
npm ci
npm test
npm run lint
npm run build
npm run verify:rag
npm run ingest:wholesale -- --dry-run --limit=2 --output=.cache/ingest-preview.json
npm run dev
```

`verify:rag` is read-only. It checks public-role access, sampled vector parity, Y2K / workwear / football / electronics relevance, full-text and vector contributions, nonsense-query rejection, and cache/refresh behavior. Use a local Supabase URL and key in `.env.local` to target a local seeded instance instead.

The database security advisor returned no findings; the directory has one public SELECT policy and no public write policies. No local Supabase stack was needed for these changes.

Final checks: 12 automated regression tests passed, ESLint passed without warnings, TypeScript passed, and the Next.js production build passed. Building requires network access to download the configured Google Fonts. A separate `.next-build` output directory was used while the local development server was running.

The complete HTTP flow returned six relevant, unique supplier/category leads. The measured denim run emitted its first chunk at 543 ms and completed in 1,469 ms; these are single development-server measurements, not a latency guarantee. MAXGRG live analysis completed in 749 ms; the GadgetGrid fixture + live directory flow completed in 247 ms.

The connected browser reported no available browser. The demo page's server render, API integration and production compilation were checked; a visual/click-through browser review remains outstanding.

An independent code review found no blocking regressions. Its RFQ finding was fixed: changing requested categories or brands now changes supplier research too. One retrieval limit remains: the app filters the RPC's best 30 results by vertical and lexical evidence. A larger or less balanced index should move those filters into SQL before ranking/limiting so relevant records outside that shortlist cannot be missed.

## Three-minute demo

1. Open `/demo` and analyse `https://maxgrg.com/`. Watch the real processing stages and inspect the live storefront profile.
2. Open the source links in **Where to source next**. Explain that the retrieved suppliers are real directory leads; the app has not confirmed their stock or prices.
3. Submit “Vintage denim and workwear in Leeds, budget £2500”. Compare the supplier leads with the clearly labelled demo inventory and policy-compliant basket.
4. Tighten a buying rule and re-run. Show why lots pass, need negotiation or are blocked.
5. Run a simulated negotiation and demo checkout. Explain the policy walk-away limit and server-side price recomputation.
6. Use **Refresh sources** to bypass both storefront and supplier research caches. GadgetGrid is an optional electronics example with an explicit storefront fixture.

For semantic retrieval, first add model metadata to the index and re-embed documents and queries with the same model. Current code deliberately disables vectors when a different model is requested; it never silently compares incompatible embeddings.
