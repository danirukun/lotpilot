# LotPilot

**LotPilot is an AI wholesale buying agent for UK indie fashion retailers.** Describe your shop and set your buying rules. The agent finds matching wholesale lots, checks them against your policy, negotiates the price, and completes the buy.

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

## Track and venue

- **Track:** Agentic Commerce.
- **Venue:** [Fleek](https://www.wearefleek.com/). Fleek is a B2B wholesale marketplace. It connects retailers with vintage and secondhand wholesalers. It is not a consumer resale app.

LotPilot acts as the retailer's procurement agent on this kind of marketplace. It turns a plain-language brief and a set of rules into a negotiated, placed order.

## Features

- **Chat brief.** The retailer describes the shop in free text.
- **Store personas.** Five preset shops let a presenter skip typing.
- **Deterministic matcher.** The agent parses the brief into store DNA. It scores every lot on aesthetic, category, brand, era, grade, and budget.
- **Buying policy engine.** The retailer sets rules in the sidebar. Each lot gets a verdict: compliant, negotiate, or blocked. Each card lists every rule with its result.
- **Supplier scorecards.** Each wholesaler has a score from 0 to 100. The score uses rating, on-time rate, grade accuracy, dispute rate, and lead time.
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
| Supplier score | 25% rating, 25% on-time, 30% grade accuracy, 10% disputes, 10% lead time |
| Risk score | Quality, grade, overpricing, disputes, lead time, and sell-through |
| Decision score | 50% fit, 20% supplier, 15% value vs market, 15% inverse risk |

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

Install the dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in a browser.

To run a production build:

```bash
npm run build
npm run start
```

The app starts on port 3000 by default. To use another port, add `-- -p <port>` to the start command.

## Environment variables

All environment variables are optional. The demo works with none of them. See [`.env.example`](.env.example) for the full list.

- **No keys.** The agent uses the deterministic engine and a canned summary. Checkout returns a mock order. This is the default demo path.
- **LLM (optional).** Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to switch on live narration. The model only writes the summary text. It never changes the ranking, the policy verdicts, the negotiation, or the economics. The request has a 12-second timeout. On any failure the app falls back to the canned summary.
- **Analytics (optional).** Set `NEXT_PUBLIC_POSTHOG_KEY` to send events to PostHog. Without it, analytics is a no-op.
- **Commerce Layer (optional).** Set `COMMERCE_LAYER_CLIENT_ID` and `COMMERCE_LAYER_ENDPOINT` to mark the order source as Commerce Layer. Without them, checkout returns a clean mock order with the same shape.

To use an LLM locally, copy the example file first:

```bash
cp .env.example .env.local
```

Then add one key and restart the server.

## Architecture

1. **Parse the brief.** `src/lib/parseBrief.ts` reads the free text. It extracts aesthetics, categories, brands, decades, budget, location, and a grade floor.
2. **Rank the lots.** `src/lib/matcher.ts` scores each lot against the store DNA and returns the top candidates with fit reasons.
3. **Procure.** `src/lib/procurement/procure.ts` adds the supplier scorecard, market benchmark, landed economics, risk, decision score, and policy verdict to each candidate.
4. **Plan.** `buildSourcingPlan` in the same file selects the opening buy. It uses negotiated price estimates.
5. **Summarise.** `src/lib/agent.ts` builds the result. If an LLM key is present, `src/lib/llm.ts` writes the narration. If not, `src/lib/summary.ts` writes a canned but specific summary.
6. **Negotiate and check out.** `src/lib/checkout.ts` negotiates the basket against the policy and builds the order.

API routes:

- `POST /api/chat` — takes `{ brief, policy? }`. Returns the store DNA, procured lots, sourcing plan, policy, and summary.
- `POST /api/negotiate` — takes `{ lotIds, policy?, budget? }`. Returns one negotiation transcript per lot.
- `POST /api/checkout` — takes `{ lotIds, policy?, budget?, negotiate? }`. Negotiates again on the server and returns a confirmed order.

Seed data:

- `src/data/lots.ts` — 32 wholesale lots with grade, piece count, wholesale price, resale price, and sell-through.
- `src/data/suppliers.ts` — 9 wholesalers with scorecard data, negotiation flexibility, early-payment and volume discounts, and shipping.
- `src/data/benchmarks.ts` — 90-day comparable price per piece for each lot.
- `src/data/personas.ts` — 5 store personas.

UI:

- `src/app/page.tsx` — the landing page.
- `src/app/demo/page.tsx` — the live agent page.
- `src/components/ChatPanel.tsx` — the chat, personas, and policy wiring.
- `src/components/PolicyPanel.tsx` — the buying policy editor.
- `src/components/SourcingPlanCard.tsx` — the plan KPIs, supplier mix, and exclusions.
- `src/components/LotCard.tsx` — the lot card with metrics and policy checks.
- `src/components/DealModal.tsx` — the negotiation playback and checkout.

## 3-minute demo script

Use this script for a live presentation. The sample lines are for the presenter to read.

1. **Open the app (0:00).** Go to http://localhost:3000. Say: "This is LotPilot. It is an AI procurement agent for indie vintage shops that buy on wholesale marketplaces like Fleek."
2. **Go to the live agent (0:15).** Click "Launch agent". Say: "No sign-up. The retailer describes the shop. The sidebar holds the buying policy: the rules the agent must obey."
3. **Run a persona (0:30).** Click "Neon Rewind", the Shoreditch Y2K shop. Say: "This is a Y2K thrift store in Shoreditch with a £2000 budget."
4. **Show the sourcing plan (0:45).** Point at the "Strategic sourcing plan" card. Say: "The agent built an opening buy of three lots from two suppliers. It costs £1,790 after negotiation, which is £150 under list. It projects about £1,650 landed profit."
5. **Show the exclusions (1:05).** Point at the exclusion list. Say: "It left out the low-rise denim because it would put too much spend with one supplier. It blocked the designer denim because it costs 18% above the market."
6. **Show a lot card (1:20).** Point at the top card, the Y2K Baby Tees Bundle. Say: "Each lot shows fit, the supplier score, landed ROI, price against 90-day comparables, and risk." Open "Policy checks". Say: "Every rule is visible. There is no black box."
7. **Negotiate (1:40).** Click "Negotiate" on the top card. Say: "Now the agent negotiates for us. It opens with market comparables, then offers early payment. It never goes above our walk-away price." Wait for the deal at £495.
8. **Place the order (2:10).** Click "Place order". Say: "The order is confirmed at £495 instead of £540. The server recomputes the negotiated price, so the client cannot fake it."
9. **Change the policy (2:25).** Close the modal. In the policy panel, set "Min grade" to "Grade A" and "Max lot price" to 600. Click "Re-run buy". Say: "Tighter rules give a different buy. The agent tells us exactly which rule blocks each lot."
10. **Close (2:45).** Say: "LotPilot turns a brief and a policy into a negotiated, placed order in seconds. The ranking, policy, and negotiation are deterministic and auditable. The optional language model only writes the summary."

## Deployment

LotPilot is Vercel-ready. It is a standard Next.js App Router project. Import the repository into Vercel and deploy. No environment variables are required for the demo. Add the optional keys in the Vercel project settings to switch on live narration, analytics, or Commerce Layer.
