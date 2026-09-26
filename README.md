# LotPilot

LotPilot is an AI wholesale buying agent for independent UK retailers who run their own physical shop and online store. They buy secondhand and vintage stock across many wholesalers, not through one marketplace. Describe your shop and set your buying rules. The agent finds matching wholesale lots, checks them against your policy, negotiates the price, and completes the buy.

## Overview

Small vintage and secondhand shops spend hours picking wholesale bales. They must guess which lots fit the shop, which lots make money, and which suppliers they can trust. Then they must haggle on price. LotPilot does this work for them.

The retailer types a short brief in chat. For example: "Y2K thrift shop in Shoreditch, £2000 budget." The agent does these steps:

1. It reads the brief and builds a store profile ("store DNA").
2. It ranks a catalog of wholesale lots on fit, margin, supplier quality, and price against the market.
3. It checks each lot against the retailer's buying policy. Examples of rules are min and max price per lot, minimum grade, and a landed ROI floor.
4. It builds a strategic sourcing plan. The plan is a diversified opening buy inside the budget.
5. It negotiates with each wholesaler, and never pays above the policy walk-away price.
6. It places the order and returns a confirmation.

LotPilot runs fully offline. It needs no paid API keys. Deterministic code does all ranking, policy checks, negotiation, and economics. An optional language model only writes the summary text.

## Hackathon venue (Fleek)

This demo was built for a hackathon hosted around [Fleek](https://www.joinfleek.com/) (B2B wholesale secondhand). LotPilot is not Fleek. It is not built on Fleek. The product targets independent UK retailers first. User-facing copy stays retailer-centric.

## Hackathon track

- **Track:** Agentic Commerce.

LotPilot acts as the retailer's procurement agent. It turns a plain-language brief, an optional quote request (RFQ), and a set of rules into a negotiated, placed order.

## Features

- **Chat brief.** The retailer describes the shop in free text.
- **Store URL analysis.** The retailer pastes a store URL. The agent reads the store and builds the store DNA, a size estimate, and a budget. See [Store feature extraction](#store-feature-extraction).
- **Store personas.** Seven preset shops let a presenter skip typing.
- **RFQ-lite matching.** The agent parses piece counts, price caps, grade preference, and brand hints from the brief. It ranks lots on how well they meet the RFQ, not only on store vibe. See [RFQ matching](#rfq-matching).
- **Deterministic matcher.** The agent parses the brief into store DNA. It scores every lot on aesthetic, category, brand, era, grade, and budget.
- **Buying policy engine.** The retailer sets rules in the sidebar. Each lot gets a verdict: compliant, negotiate, or blocked. Each card lists every rule with its result.
- **Supplier scorecards.** Each wholesaler has a 0–100 score on reliability, grade consistency, fill rate, and QC/return risk. See [Supplier scorecards](#supplier-scorecards).
- **Market benchmarks.** Each lot has a 90-day comparable price per piece. The card shows the price against the market.
- **Total cost of ownership.** Landed cost includes shipping. Landed profit includes the expected loss from grade misdeclaration.
- **Risk score.** Each lot has a low, medium, or high risk level. The level uses quality, grade, overpricing, disputes, lead time, and sell-through.
- **Decision score.** One number combines fit, supplier score, value against the market, and risk.
- **Strategic sourcing plan.** The agent builds an opening buy inside the budget. It respects supplier concentration and category caps. It lists every excluded lot with the reason.
- **Negotiation agent.** The agent negotiates in rounds. It uses market comparables, early payment, volume bundles, and repeat-order intent as levers. It walks away when the supplier cannot meet the policy.
- **Deal room.** A modal plays back each negotiation message, then shows the savings before checkout.
- **Simulated checkout.** The server recomputes every negotiated price, so the client cannot set a price. The order shows lines, savings, shipping, total, and a delivery estimate.
- **Optional LLM narration.** With an API key, a model writes the buyer's briefing. Ranking, policy, and numbers stay deterministic.
- **Offline-first.** No key is required for any step of the demo.

## Store feature extraction

The retailer can paste a store URL instead of a brief. The engine is in `src/lib/store/`. `extractStoreProfile(url)` in `extract.ts` returns a `StoreProfile`.

Completed profiles are cached under `.cache/store-profiles/` (override with `STORE_CACHE_DIR`) for 24 hours (`STORE_CACHE_TTL_MS`). Cache hits replay the same analysis so demo runs stay deterministic and skip live fetch / Tavily / Places. Pass `{ refresh: true }` on `/api/store` or `/api/chat` to force a fresh read.

### Sources

The engine reads these sources in this order:

1. **Live landing page.** The engine gets the page with a 6-second timeout and a 1.5 MB limit. It blocks private and local hosts.
2. **Demo snapshot (fallback).** Three demo stores have a built-in snapshot: `neonrewind.co.uk`, `loomandrivet.com`, and `gadgetgrid.co.uk`. The engine uses a snapshot only when the live page cannot be fetched (for example `neonrewind.co.uk` has no public DNS).
3. **Store name.** The engine uses `og:site_name`, the JSON-LD business name, a short brand segment of the title, or the domain.
4. **SEO data.** The engine reads the title, meta description, keywords, OpenGraph tags, Twitter tags, the canonical link, the page language, and the JSON-LD types.
5. **Categories.** The engine reads navigation links such as `/collections/` and `/product-category/`. On Shopify, it also reads the public `/collections.json` and `/products.json` feeds. It removes junk names, for example numbers, search pages, "All ..." pages, sale and gift pages, and names that repeat the brand. It prefers collections that have products.
6. **Google Maps listing.** The engine tries these sources in this order:
   - The Google Places API (New), if `GOOGLE_MAPS_API_KEY` is set.
   - Web research with Tavily, if `TAVILY_API_KEY` is set. The engine searches for the store name with "google maps reviews address". It reads the rating, the review count, the address, and the store types from the search snippets.
   - The demo snapshot Maps listing, when the page came from a fixture.
   - The JSON-LD business data on the store page.
7. **Web research.** When `TAVILY_API_KEY` is set, Tavily always runs, including for demo domains. Results go into the classifier and the store profile. Keep the key in `.env.local`.

The engine ignores a failed source and continues. Without keys, fixtures and JSON-LD still produce a full offline profile.

### Size buckets

The engine gives points for each signal: product count, stocked collections, Maps reviews, and physical locations. Collections alone cannot make a store "large". Review counts from web research do not change the size, because they can come from other review sites. The average points give the bucket.

| Bucket | Description | Budget range | Suggested budget |
| --- | --- | --- | --- |
| Micro | 1 person or market stall | £500–£1,500 | £1,000 |
| Small | Single indie shop | £1,500–£5,000 | £2,500 |
| Medium | Established shop or 2–3 sites | £5,000–£20,000 | £8,000 |
| Large | Multi-site or high-volume online | £20,000–£80,000 | £25,000 |

A store URL run uses the suggested budget.

### Verticals

The classifier uses weighted keywords from the name, SEO data, categories, product feed, and web research. Maps store types add more weight. The classes are: clothing, footwear, accessories, electronics, home, beauty, books and media, toys and games, sports and outdoor, food and drink, and general.

The default catalog is secondhand fashion (43 lots). **Electronics stores** (for example the `gadgetgrid.co.uk` fixture) rank a separate refurbished-tech catalog (8 lots: phones, laptops, headphones, cables, tablets, gaming, accessories). Fashion personas never see electronics lots. GadgetGrid never sees fashion lots.

Other non-fashion verticals (home, beauty, and so on) still get the fashion catalog with a weak-match banner. The agent uses at most a £500 exploratory cap and zero to two lots.

## RFQ matching

The RFQ engine lives in `src/lib/rfq/`. `resolveRfq` merges store DNA with a deterministic parser (`parse.ts`) and an optional LLM parser when a key is set.

### Supported phrases

The deterministic parser reads:

- **Piece count:** ranges like `80-120`, `30 to 50`, or `100+ pieces`.
- **Price per piece:** `max £12 a piece`, `under £30 per piece`, `£12/pc`, `12pp`.
- **Budget:** `budget £2k`, `£2500`, or `2 grand` when tied to the buy.
- **Grades:** `grade A or B`, `A/B grades`, `grade A only`, `A+` / `or better`, and `grade A preferred`.
- **Brands:** names from the shared brand dictionary (for example Levi's, Wrangler, adidas).

The chat UI shows a one-line summary, for example: `80–120 Y2K tops, grade A/B, ≤£12/pc, budget £2k`. The retailer can edit the RFQ and re-run.

### Grade A/B/C mapping

Retailers speak in letters A, B, and C. The catalog uses grades A, AB, B, and Mixed.

| Letter | Catalog grades accepted |
| --- | --- |
| A | A |
| B | AB, B |
| C | Mixed |

`lettersToGrades` keeps catalog grades in best-to-worst order: A, AB, B, Mixed. Ranking uses the worst accepted letter as the grade floor when the RFQ sets grades.

### Scoring and ranking

`scoreRfq` scores style, piece count, price per piece, grade, brands, and budget fit. Each check has a weight (style 30%, price 25%, pieces 20%, grade 20%, brands 15%, budget 10%). The RFQ score blends with store fit; explicit constraints increase the RFQ weight.

`selectCandidates` in `rank.ts` scores the full catalog, then sorts by RFQ relevance plus a supplier pull (±0.2 points per scorecard point around 85) and a key-supplier boost. Lots with a hard RFQ miss are excluded from the sourcing plan.

### UI

- **RfqSummaryCard:** RFQ line, chips, and optional edit form.
- **LotCard:** RFQ match %, expandable RFQ checks, supplier score with expandable scorecard, and key-supplier label.

## Supplier scorecards

Scorecards are in `src/data/supplierScorecards.ts`. `scoreSupplier` in `policy.ts` builds the overall score:

| Dimension | Share of overall score |
| --- | --- |
| Reliability (on-time delivery) | 30% |
| Grade consistency (grade accuracy) | 30% |
| Fill rate | 20% |
| QC/return safety (from dispute risk) | 20% |

The overall score is 0–100 with bands A–D. `withPurchaseHistory` marks **key suppliers** when the active persona has past orders with that wholesaler.

Ranking uses supplier score in three places: candidate selection (pull and tie-break), decision score (25%), and plan line display. Key suppliers get a small boost in ranking and decision score.

## Procurement model

### Buying policy rules

The retailer edits these rules in the "Buying policy" panel. The defaults are in `src/lib/procurement/policy.ts`.

| Rule | Default | Type |
| --- | --- | --- |
| Min lot price | £300 | Hard |
| Max lot price | £1,000 | Price (negotiable) |
| Max price per piece | £40 | Price (negotiable) |
| Max price vs market | +5% | Price (negotiable) |
| Max budget per lot | 50% | Price (negotiable) |
| Min landed ROI | 40% | Price (negotiable) |
| Min grade | AB | Hard |
| Min sell-through | 70% | Hard |
| Min supplier score | 75/100 | Hard |
| Max spend per supplier | 60% of budget | Sourcing |
| Max lots per category | 2 | Sourcing |
| Opening ask below list | 12% | Negotiation |
| Max rounds | 4 | Negotiation |
| Auto-negotiate, early payment, volume bundles | On | Negotiation |

A hard rule blocks the lot when it fails. A price rule is "negotiable" when the supplier can reach a compliant price with the allowed levers. If the supplier cannot reach it, the rule fails and the lot is blocked.

### Metrics

| Metric | How it is calculated |
| --- | --- |
| Fit score | Aesthetic, category, brand, and era matches, plus margin, minus grade and budget penalties |
| Projected ROI | (Units sold × resale price − wholesale price) ÷ wholesale price |
| Price vs market | Price per piece ÷ 90-day comparable price per piece |
| Landed cost | Price + shipping |
| Landed ROI | (Revenue after grade-accuracy loss − landed cost) ÷ landed cost |
| Supplier score | 30% reliability, 30% grade consistency, 20% fill rate, 20% QC/return safety |
| Risk score | Quality, grade, overpricing, disputes, lead time, and sell-through |
| Decision score | 45% RFQ/store relevance, 25% supplier, 15% value vs market, 15% inverse risk (plus key-supplier boost) |

### Negotiation

The engine is in `src/lib/procurement/negotiation.ts`.

- The **walk-away price** is the lowest of the policy price caps and the list price.
- The **opening offer** is the lower of the target discount and the market value, and it is below the walk-away price.
- The buyer concedes on a slow-then-fast curve towards the walk-away price.
- The supplier concedes half of the gap each round. It never goes below a hidden floor.
- Each lever lowers the supplier floor when the policy allows it. Round 1 uses market comparables. Round 2 uses early payment. Round 3 uses a volume bundle when the basket has more lots from the same supplier.
- The result is "agreed" at a price, or "walked away".

## Tech stack

- Next.js 14.2 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Node.js API routes

## How to run

Install dependencies and copy the env template:

```bash
npm install
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/demo in a browser.

To run a production build:

```bash
npm run build
npm run start
```

The app starts on port 3000 by default. To use another port, add `-- -p <port>` to the start command.

## Environment variables

All environment variables are optional. The demo works with none of them. Placeholders in [`.env.example`](.env.example):

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI narration |
| `OPENAI_MODEL` | OpenAI model name |
| `ANTHROPIC_API_KEY` | Anthropic narration |
| `ANTHROPIC_MODEL` | Anthropic model name |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host |
| `COMMERCE_LAYER_CLIENT_ID` | Commerce Layer checkout |
| `COMMERCE_LAYER_ENDPOINT` | Commerce Layer API base URL |
| `TAVILY_API_KEY` | Tavily web research (keep in `.env.local` only) |
| `GOOGLE_MAPS_API_KEY` | Google Places lookup for store URLs |

- **No keys.** The agent uses the deterministic engine and a canned summary. Checkout returns a mock order. This is the default demo path.
- **LLM (optional).** Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to switch on live narration. The model only writes the summary text. It never changes the ranking, the policy verdicts, the negotiation, or the economics. The request has a 12-second timeout. On any failure the app falls back to the canned summary.
- **Analytics (optional).** Set `NEXT_PUBLIC_POSTHOG_KEY` to send events to PostHog. Without it, analytics is a no-op.
- **Google Maps (optional).** Set `GOOGLE_MAPS_API_KEY` to find the store's Google Maps listing with the Places API (New) text search.
- **Web research (optional).** Set `TAVILY_API_KEY` to search the web with Tavily. The engine uses the results as a Maps listing fallback and as extra text for the classifier. The request has a 7-second timeout. On any failure the engine continues without it. Keep the key in `.env.local` only. Do not commit it.
- **Commerce Layer (optional).** Set `COMMERCE_LAYER_CLIENT_ID` and `COMMERCE_LAYER_ENDPOINT` to mark the order source as Commerce Layer. Without them, checkout returns a clean mock order with the same shape.

To use an LLM locally, copy the example file first:

```bash
cp .env.example .env.local
```

Then add one key and restart the server.

## Architecture

1. **Parse the brief.** `src/lib/parseBrief.ts` reads the free text. It extracts aesthetics, categories, brands, decades, budget, location, and a grade floor. For a store URL, `src/lib/store/extract.ts` builds the DNA from the store instead.
2. **Resolve the RFQ.** `src/lib/rfq/resolve.ts` merges DNA with parsed or edited RFQ fields.
3. **Rank and procure.** `src/lib/rfq/rank.ts` scores the catalog on RFQ fit and supplier score, then `procure.ts` adds benchmarks, landed economics, risk, decision score, and policy verdict.
4. **Plan.** `buildSourcingPlan` selects the opening buy with negotiated price estimates. Electronics stores get a full tech plan. Other non-fashion stores get an exploratory fashion cap only.
5. **Summarise.** `src/lib/agent.ts` builds the result. If an LLM key is present, `src/lib/llm.ts` writes the narration. If not, `src/lib/summary.ts` writes a canned but specific summary.
6. **Negotiate and check out.** `src/lib/checkout.ts` negotiates the basket against the policy and builds the order.

API routes:

- `POST /api/chat` takes `{ brief, policy?, rfq? }` or `{ storeUrl, policy?, refresh? }`. Returns store DNA, RFQ, procured lots, sourcing plan, policy, and summary. With `storeUrl`, the result also has `store`, the store profile.
- `POST /api/store` takes `{ url, refresh? }`. Returns the store profile (cached by default). Returns 400 for a URL that is not public.
- `POST /api/negotiate` takes `{ lotIds, policy?, budget? }`. Returns one negotiation transcript per lot.
- `POST /api/checkout` takes `{ lotIds, policy?, budget?, negotiate? }`. Negotiates again on the server and returns a confirmed order.

Seed data:

- `src/data/lots.ts`: 43 fashion lots plus 8 electronics lots (`catalog: "electronics"`).
- `src/data/suppliers.ts`: 13 wholesalers with scorecard data, negotiation flexibility, early-payment and volume discounts, and shipping.
- `src/data/benchmarks.ts`: 90-day comparable price per piece for each lot.
- `src/data/personas.ts`: 7 store personas.
- `src/data/supplierScorecards.ts`: reliability, grade consistency, fill rate, and QC metrics per supplier.
- `src/data/purchaseHistory.ts`: key-supplier purchase history per persona.

UI:

- `src/app/page.tsx`: the landing page.
- `src/app/demo/page.tsx`: the live agent page.
- `src/components/ChatPanel.tsx`: the chat, personas, RFQ edit, and policy wiring.
- `src/components/RfqSummaryCard.tsx`: RFQ summary and edit form.
- `src/components/RfqChecks.tsx`: per-lot RFQ check list.
- `src/components/SupplierScorecard.tsx`: supplier score badge and expandable dimensions.
- `src/components/PolicyPanel.tsx`: the buying policy editor.
- `src/components/SourcingPlanCard.tsx`: the plan KPIs, supplier mix, and exclusions.
- `src/components/StoreProfileCard.tsx`: the store profile: vertical, size, Maps listing, search snippet, categories, DNA, and sources.
- `src/components/LotCard.tsx`: the lot card with metrics and policy checks.
- `src/components/DealModal.tsx`: the negotiation playback and checkout.

## 3-minute demo script

Use this script for a live presentation. The sample lines are for the presenter to read.

1. **Open the app (0:00).** Go to http://localhost:3000. Say: "This is LotPilot. It is an AI buying agent for independent UK retailers who run a shop and a website and buy vintage stock from many wholesalers."
2. **Go to the live agent (0:15).** Click "Launch agent". Say: "No sign-up. The retailer describes the shop. The sidebar holds the buying policy."
3. **Neon Rewind persona (0:25).** Click "Neon Rewind". Say: "Y2K thrift in Shoreditch, £2000 budget." Point at the RFQ line. Say: "The agent turned the brief into a quote request."
4. **Sourcing plan (0:40).** Say: "Opening buy: three lots, £1,790 spend, £150 saved, ~90% landed ROI. Top pick: Y2K Baby Tees Bundle. RFQ line: `Y2K clubwear denim & tops, budget £2k`."
5. **Lot card (0:55).** Expand the supplier scorecard and RFQ checks. Say: "RFQ match, supplier score, and policy checks are all visible."
6. **Negotiate (1:10).** Click "Negotiate" on the top card. Say: "Market comparables, then early payment. Deal at £495, £45 under list."
7. **RFQ-style brief (1:25).** Paste: `I need 80-120 Y2K tops, grade A or B, max £12 a piece, budget £2k`. Say: "RFQ: `80–120 Y2K clubwear denim & tops, grade A/B, ≤£12/pc, budget £2k`. Plan: three lots, £1,795 spend, £165 saved."
8. **MAXGRG (1:35).** Click MAXGRG. Say: "Four lots, £2,335 spend, £180 saved. Top pick: Vintage Levi's Jeans Mixed Wash Bundle."
9. **Levi RFQ (1:45).** Paste: `Looking for 30-50 vintage Levi's or Wrangler jeans, grade A only, under £30 per piece, £2500`. Say: "RFQ: `30–50 vintage streetwear Levi's / Wrangler denim & outerwear & more, grade A, ≤£30/pc, budget £2.5k`. Three lots, £2,095 spend."
10. **Classic Football Shirts (1:55).** Click that persona. Say: "Four lots, £2,880 spend, £260 saved, ~83% ROI. Top pick: 90s English League Football Shirts."
11. **Policy tweak (2:05).** Set min grade to A and max lot price to £600. Re-run. Say: "Tighter rules change the buy. Each exclusion names the rule."
12. **Store URLs (2:15).** Click `neonrewind.co.uk`. Say: "Small Y2K clothing, £2,500 budget from size signals." Click `gadgetgrid.co.uk`. Say: "Five refurbished tech lots, £2,740 spend, £231 saved. Top pick: Refurbished Business Laptops, Dell and HP. No fashion lots."
13. **Close (2:50).** Say: "Ranking, RFQ scoring, policy, and negotiation are deterministic. The optional LLM only writes the summary."

## Deployment

LotPilot is Vercel-ready. It is a standard Next.js App Router project. Import the repository into Vercel and deploy. No environment variables are required for the demo. Add the optional keys in the Vercel project settings to switch on live narration, analytics, or Commerce Layer.
