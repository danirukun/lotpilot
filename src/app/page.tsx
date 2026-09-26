import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LOTS } from "@/data/lots";
import { PERSONAS } from "@/data/personas";
import { gbp } from "@/lib/format";

const STEPS = [
  {
    n: "01",
    title: "Learn your store DNA",
    body: "Describe your shop in a sentence, paste a Shopify URL or pick a preset persona. LotPilot extracts aesthetic, categories, brands, era and budget."
  },
  {
    n: "02",
    title: "Source strategically",
    body: "It ranks every lot on store fit, supplier scorecard, 90-day market comparables and landed ROI after shipping and grade risk. Then it builds a diversified opening buy."
  },
  {
    n: "03",
    title: "Enforce your buying policy",
    body: "You set the rules: min and max price per lot, price per piece, grade, sell-through, ROI floor and supplier concentration. Every lot shows which rules pass."
  },
  {
    n: "04",
    title: "Negotiate and buy",
    body: "The agent negotiates with each wholesaler, using market comps, early payment and volume bundles. It never goes above your walk-away price. Then it places the order."
  }
];

export default function LandingPage() {
  const catalogValue = LOTS.reduce((sum, l) => sum + l.wholesalePrice, 0);
  const catalogPieces = LOTS.reduce((sum, l) => sum + l.pieceCount, 0);
  const featured = LOTS.filter((l) =>
    ["lot-001", "lot-002", "lot-010", "lot-025"].includes(l.id)
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-app grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="label-eyebrow">Agentic Commerce · Fleek wholesale</span>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              The AI buyer that stocks your shop while you sleep.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-paper/70">
              LotPilot is a wholesale buying agent for UK indie retailers. Tell it your
              store DNA and your buying policy. It finds matching secondhand lots, scores
              fit, margin and supplier risk, negotiates the price and completes the purchase.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/demo" className="btn-primary px-6 py-3 text-base">
                Try the live agent
              </Link>
              <Link href="/#how" className="btn-ghost px-6 py-3 text-base">
                See how it works
              </Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              <Stat label="Live lots" value={`${LOTS.length}`} />
              <Stat label="Pieces on floor" value={catalogPieces.toLocaleString()} />
              <Stat label="Wholesale value" value={gbp(catalogValue)} />
            </dl>
          </div>

          <div className="animate-fade-up rounded-3xl border border-ink-line bg-ink-soft/70 p-5 shadow-card backdrop-blur">
            <div className="mb-4 flex items-center gap-2 text-xs text-paper/50">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400/70" />
              <span className="ml-2">lotpilot · agent session</span>
            </div>
            <div className="space-y-3 text-sm">
              <Bubble who="retailer">
                I run a Y2K thrift shop in Shoreditch, £2000 budget.
              </Bubble>
              <Bubble who="agent">
                Read you as a Y2K buyer in Shoreditch. Scanning the wholesale floor…
              </Bubble>
              <div className="rounded-xl border border-ink-line bg-ink/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Y2K Baby Tees Bundle</span>
                  <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-semibold text-brand-200">
                    86/100 fit
                  </span>
                </div>
                <p className="mt-1 text-xs text-paper/60">
                  60 pieces · Grade A · {gbp(540)} · ~108% projected ROI
                </p>
              </div>
              <Bubble who="agent">
                Negotiated with Rewind Bales: {gbp(540)} → {gbp(495)} using market comps and
                early payment. Inside your policy. Place the order?
              </Bubble>
            </div>
          </div>
        </div>
      </section>

      {/* Problem / positioning */}
      <section className="border-y border-ink-line/60 bg-ink-soft/40">
        <div className="container-app grid gap-6 py-12 md:grid-cols-3">
          <Positioning
            title="Buying is the hard part"
            body="Indie retailers live or die on what they buy. Sifting wholesale bales for the right aesthetic and margin is slow, manual guesswork."
          />
          <Positioning
            title="An agent, not a catalog"
            body="LotPilot doesn't just list lots. It reasons about your store, obeys your procurement policy, negotiates on your behalf and transacts end-to-end."
          />
          <Positioning
            title="Built on Fleek"
            body="Fleek is the B2B wholesale marketplace for secondhand fashion — connecting retailers with vintage wholesalers. LotPilot is the buyer on top."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container-app py-16 lg:py-20">
        <div className="max-w-2xl">
          <span className="label-eyebrow">How it works</span>
          <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
            From store brief to placed order in four steps.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <span className="font-display text-2xl text-brand-400">{s.n}</span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-paper/65">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured lots */}
      <section className="border-t border-ink-line/60 bg-ink-soft/40">
        <div className="container-app py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="label-eyebrow">On the wholesale floor</span>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
                A live, graded catalog.
              </h2>
            </div>
            <Link href="/demo" className="btn-ghost hidden sm:inline-flex">
              Match my store →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((lot) => (
              <div key={lot.id} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lot.image}
                  alt={lot.title}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="chip">Grade {lot.grade}</span>
                    <span className="chip">{lot.pieceCount} pcs</span>
                  </div>
                  <h3 className="mt-3 font-semibold leading-tight">{lot.title}</h3>
                  <p className="mt-1 text-xs text-paper/55">{lot.wholesaler}</p>
                  <p className="mt-3 text-sm font-semibold text-brand-300">
                    {gbp(lot.wholesalePrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas CTA */}
      <section className="container-app py-16 lg:py-20">
        <div className="card overflow-hidden">
          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_1fr] lg:p-12">
            <div>
              <span className="label-eyebrow">Try it now</span>
              <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
                Pick a store persona or describe your own.
              </h2>
              <p className="mt-4 text-paper/70">
                No sign-up, no keys required. The agent runs a deterministic matcher out
                of the box and upgrades to live LLM reasoning if an API key is present.
              </p>
              <Link href="/demo" className="btn-primary mt-6 px-6 py-3 text-base">
                Launch the agent
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERSONAS.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-xl border border-ink-line bg-ink/50 p-4">
                  <div className="text-2xl">{p.emoji}</div>
                  <div className="mt-2 font-semibold">{p.name}</div>
                  <div className="text-xs text-paper/55">{p.location}</div>
                  <div className="mt-2 text-xs text-brand-300">
                    Budget {gbp(p.budget)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-line/60">
        <div className="container-app flex flex-col items-center justify-between gap-4 py-8 text-sm text-paper/50 sm:flex-row">
          <Logoish />
          <p>Built for the Agentic Commerce hackathon · Demo data only.</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-line bg-ink/40 px-3 py-3">
      <dt className="text-xs text-paper/50">{label}</dt>
      <dd className="mt-1 font-display text-xl text-paper">{value}</dd>
    </div>
  );
}

function Positioning({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-brand-200">{title}</h3>
      <p className="mt-2 text-sm text-paper/65">{body}</p>
    </div>
  );
}

function Bubble({ who, children }: { who: "retailer" | "agent"; children: React.ReactNode }) {
  const isAgent = who === "agent";
  return (
    <div className={isAgent ? "flex" : "flex justify-end"}>
      <div
        className={
          isAgent
            ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-ink/70 px-3 py-2 text-paper/85"
            : "max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500/20 px-3 py-2 text-brand-100"
        }
      >
        {children}
      </div>
    </div>
  );
}

function Logoish() {
  return (
    <span className="font-semibold text-paper/70">
      Lot<span className="text-brand-400">Pilot</span>
    </span>
  );
}
