# LotPilot

**LotPilot is an AI wholesale buying agent for UK indie fashion retailers.** Describe your shop. The agent ranks wholesale lots by fit and margin, then completes the buy.

## Overview

Small vintage and secondhand shops spend hours picking wholesale bales. They must guess which lots fit the shop and which lots make money. LotPilot does this work for them.

The retailer types a short brief in chat. For example: "Y2K thrift shop in Shoreditch, £2000 budget." The agent reads the brief, ranks a catalog of wholesale lots, and shows the best picks. Each pick lists why it fits and what it should earn. The retailer confirms one lot. The agent completes a simulated wholesale checkout and returns an order confirmation.

LotPilot runs fully offline. It needs no paid API keys. A deterministic matcher does all ranking and economics. An optional language model only writes the summary text.

## Track and venue

- **Track:** Agentic Commerce.
- **Venue:** [Fleek](https://www.wearefleek.com/). Fleek is a B2B wholesale marketplace. It connects retailers with vintage and secondhand wholesalers. It is not a consumer resale app.

LotPilot acts as the retailer's buyer on this kind of marketplace. It turns a plain-language store brief into a ranked, costed shopping list, then places the order.

## Features

- **Chat brief.** The retailer describes the shop in free text.
- **Store personas.** Five preset shops let a presenter skip typing.
- **Deterministic matcher.** The agent parses the brief into structured store DNA. It scores every lot on aesthetic, category, brand, era, grade, and budget.
- **Margin model.** Each lot shows projected revenue, profit, margin, ROI, and expected units sold.
- **Ranked lot cards.** Each card shows the fit score, plain-language fit reasons, and the economics.
- **Simulated checkout.** The retailer confirms a lot. The app returns an order with an ID, amount, and delivery estimate.
- **Optional LLM narration.** With an API key, a model writes the buyer's briefing. Ranking and numbers stay deterministic.
- **Offline-first.** No key is required for any step of the demo.

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

- **No keys.** The agent uses the deterministic matcher and a canned summary. Checkout returns a mock order. This is the default demo path.
- **LLM (optional).** Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to switch on live narration. The model only writes the summary text. It never changes the ranking or the economics. The request has a 12-second timeout. On any failure the app falls back to the canned summary.
- **Analytics (optional).** Set `NEXT_PUBLIC_POSTHOG_KEY` to send events to PostHog. Without it, analytics is a no-op.
- **Commerce Layer (optional).** Set `COMMERCE_LAYER_CLIENT_ID` and `COMMERCE_LAYER_ENDPOINT` to mark the order source as Commerce Layer. Without them, checkout returns a clean mock order with the same shape.

To use an LLM locally, copy the example file first:

```bash
cp .env.example .env.local
```

Then add one key and restart the server.

## Architecture

The flow has four steps. The first three are deterministic.

1. **Parse the brief.** `src/lib/parseBrief.ts` reads the free text. It extracts aesthetics, categories, brands, decades, budget, location, and a grade floor. It uses keyword dictionaries, so the result is stable.
2. **Rank the lots.** `src/lib/matcher.ts` scores each lot in the catalog against the store DNA. Fit points come from aesthetic, category, brand, and era matches. Margin points scale from ROI. The matcher applies penalties for grade and budget misses. It returns the top matches with fit reasons.
3. **Compute economics.** `src/lib/economics.ts` computes revenue, profit, margin, ROI, and expected units sold from the lot's resale price, sell-through, and wholesale cost.
4. **Write the summary.** `src/lib/agent.ts` builds the result. If an LLM key is present, `src/lib/llm.ts` writes the narration. If not, `src/lib/summary.ts` writes a canned but specific summary.

API routes:

- `POST /api/chat` — takes a brief, returns the store DNA, ranked lots, and summary. See `src/app/api/chat/route.ts`.
- `POST /api/checkout` — takes a lot ID, returns a confirmed order. See `src/app/api/checkout/route.ts`.

Seed data:

- `src/data/lots.ts` — 32 wholesale lots with grade, piece count, wholesale price, resale price, and sell-through.
- `src/data/personas.ts` — 5 store personas.

UI:

- `src/app/page.tsx` — the landing page.
- `src/app/demo/page.tsx` — the live agent page.
- `src/components/` — the header, chat panel, lot cards, checkout modal, and score bar.

## 3-minute demo script

Use this script for a live presentation. The sample lines are for the presenter to read.

1. **Open the app.** Go to http://localhost:3000. Say: "This is LotPilot. It is an AI buying agent for indie vintage shops on wholesale marketplaces like Fleek."
2. **Go to the live agent.** Click the demo link to open `/demo`. Say: "No sign-up. The retailer just describes the shop."
3. **Pick a persona.** In the left sidebar, click "Neon Rewind", the Shoreditch Y2K shop. Say: "This shop is a Y2K thrift store in Shoreditch with a £2000 budget."
4. **Run the agent.** Send the brief. Say: "The agent reads the brief, builds a store profile, and ranks every wholesale lot by fit and by margin."
5. **Read the top pick.** Point at the first lot card. Say: "The top pick is a Y2K low-rise denim lot. It matches the Y2K lean, it fills the denim rail, and it fits the budget. The card shows the projected ROI and profit, not just the price."
6. **Explain the economics.** Point at the economics row. Say: "LotPilot projects revenue from the resale price and the sell-through rate, then subtracts the wholesale cost. The buyer sees the margin before they commit."
7. **Confirm the buy.** Click "Confirm & buy" on the top lot. Say: "The retailer picks one lot, and the agent places the order."
8. **Show the confirmation.** Point at the modal. Say: "The order is confirmed with an order ID and a delivery estimate. On a real marketplace this is where the Commerce Layer cart would run. Here it is a clean simulated order, so the demo needs no paid API."
9. **Close.** Say: "LotPilot turns a plain-language brief into a ranked, costed buy in seconds. Ranking and economics are deterministic. The optional language model only writes the summary."

## Deployment

LotPilot is Vercel-ready. It is a standard Next.js App Router project. Import the repository into Vercel and deploy. No environment variables are required for the demo. Add the optional keys in the Vercel project settings to switch on live narration, analytics, or Commerce Layer.
