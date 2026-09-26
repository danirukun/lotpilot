"use client";

import { useEffect, useRef, useState } from "react";
import { DealModal, type DealItem } from "@/components/DealModal";
import { MatchesPanel } from "@/components/MatchesPanel";
import { PolicyPanel } from "@/components/PolicyPanel";
import { RfqSummaryCard } from "@/components/RfqSummaryCard";
import { SourcingPlanCard } from "@/components/SourcingPlanCard";
import { StoreProfileCard } from "@/components/StoreProfileCard";
import { PERSONAS } from "@/data/personas";
import { DEMO_STORE_URLS } from "@/data/storeFixtures";
import { LOTS } from "@/data/lots";
import { track } from "@/lib/analytics";
import { DEFAULT_POLICY } from "@/lib/procurement/policy";
import type { BuyingPolicy, ProcuredLot } from "@/lib/procurement/types";
import type { AgentResult } from "@/lib/types";
import { rfqSummaryLine } from "@/lib/rfq/format";
import { applyRfqPatch, type RfqPatch } from "@/lib/rfq/resolve";

interface ActiveDeal {
  items: DealItem[];
  negotiate: boolean;
  policy: BuyingPolicy;
  budget: number;
}

const toItem = (lotId: string): DealItem => {
  const lot = LOTS.find((l) => l.id === lotId)!;
  return {
    lotId,
    title: lot.title,
    wholesaler: lot.wholesaler,
    listPrice: lot.wholesalePrice,
    image: lot.image
  };
};

interface UserTurn {
  role: "user";
  text: string;
}
interface AgentTurn {
  role: "agent";
  result: AgentResult;
}
type Turn = UserTurn | AgentTurn;

type AgentRequest = ({ brief: string } | { storeUrl: string }) & { rfq?: RfqPatch };

const SUGGESTIONS = [
  "I run a Y2K thrift shop in Shoreditch, £2000 budget.",
  "Vintage denim and workwear store in Leeds, budget £2500, Grade A.",
  "Cottagecore boutique in Bristol, floral dresses and knits, ~£1500."
];

export function ChatPanel() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<BuyingPolicy>(DEFAULT_POLICY);
  const [lastRequest, setLastRequest] = useState<AgentRequest | null>(null);
  const [deal, setDeal] = useState<ActiveDeal | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  const revealChat = () => {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = (brief: string) => {
    const clean = brief.trim();
    if (!clean) return;
    setInput("");
    track("brief_submitted", { length: clean.length });
    return run({ brief: clean }, clean);
  };

  const analyseStore = (url: string) => {
    const clean = url.trim();
    if (!clean) return;
    track("store_url_submitted", { url: clean });
    return run({ storeUrl: clean }, `Analyse my store: ${clean}`);
  };

  async function run(request: AgentRequest, userText: string) {
    if (loading) return;
    setError(null);
    setTurns((t) => [...t, { role: "user", text: userText }]);
    setLastRequest(request);
    setLoading(true);
    revealChat();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, policy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Agent error");
      setTurns((t) => [...t, { role: "agent", result: data as AgentResult }]);
      revealChat();
      track("matches_returned", {
        source: data.source,
        count: data.matches?.length ?? 0
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const started = turns.length > 0 || loading;

  const editRfq = (result: AgentResult, patch: RfqPatch) => {
    track("rfq_edited", { fields: Object.keys(patch).length });
    return run(
      { brief: result.dna.brief, rfq: patch },
      `Edited RFQ: ${rfqSummaryLine(applyRfqPatch(result.rfq, patch, "edited"))}`
    );
  };

  const openDeal = (result: AgentResult, lotIds: string[], negotiate: boolean) =>
    setDeal({ items: lotIds.map(toItem), negotiate, policy: result.policy, budget: result.plan.budget });

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar — below chat on narrow viewports so results are not off-screen */}
      <aside className="order-2 space-y-4 lg:order-1">
        <div className="card p-4">
          <h2 className="text-sm font-semibold">Store personas</h2>
          <p className="mt-1 text-xs text-paper/55">
            Personas with a site URL run store analysis. The rest send a typed brief.
          </p>
          <div className="mt-3 space-y-2">
            {PERSONAS.map((p) => (
              <div key={p.id}>
                <button
                  type="button"
                  onClick={() => (p.url ? analyseStore(p.url) : submit(p.brief))}
                  disabled={loading}
                  title={p.url ? `Analyse ${p.url}` : p.brief}
                  className="flex w-full items-start gap-3 rounded-xl border border-ink-line bg-ink/40 px-3 py-2 text-left transition hover:border-brand-500/60 hover:bg-ink/70 disabled:opacity-50"
                >
                  <span className="text-xl leading-6">{p.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-paper/50">{p.location}</span>
                    <span className="mt-1 block text-xs leading-snug text-paper/70">{p.blurb}</span>
                  </span>
                </button>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-11 mt-1 inline-block text-[11px] text-brand-300 hover:underline"
                  >
                    {new URL(p.url).hostname.replace(/^www\./, "")} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold">Analyse a store URL</h2>
          <p className="mt-1 text-xs text-paper/55">
            Fetches the live page and Shopify feeds when public. Runs Tavily when{" "}
            <code className="text-paper/70">TAVILY_API_KEY</code> is set, and Google Places when mapped.
            Demo domains use a snapshot only if the live page fails.
          </p>
          <StoreUrlInput onAnalyse={analyseStore} disabled={loading} />
        </div>

        <PolicyPanel
          policy={policy}
          onChange={setPolicy}
          canApply={Boolean(lastRequest) && !loading}
          onApply={() => {
            if (!lastRequest) return;
            track("policy_applied", { ...policy });
            if ("storeUrl" in lastRequest) analyseStore(lastRequest.storeUrl);
            else run(lastRequest, lastRequest.brief);
          }}
        />
      </aside>

      {/* Conversation — first on mobile so persona / send results are on screen */}
      <section
        ref={chatRef}
        className="card order-1 flex h-[80vh] min-h-[600px] scroll-mt-20 flex-col overflow-hidden lg:sticky lg:top-20 lg:order-2"
      >
        <div ref={feedRef} className="scroll-slim flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {!started && <EmptyState onPick={submit} />}

          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] animate-fade-up rounded-2xl rounded-tr-sm bg-brand-500/20 px-4 py-2.5 text-brand-50">
                  {turn.text}
                </div>
              </div>
            ) : (
              <AgentMessage
                key={i}
                result={turn.result}
                disabled={loading}
                onBuy={(m) =>
                  openDeal(
                    turn.result,
                    [m.lot.id],
                    turn.result.policy.autoNegotiate || m.policy.status !== "compliant"
                  )
                }
                onNegotiate={(m) => openDeal(turn.result, [m.lot.id], true)}
                onEditRfq={turn.result.store ? undefined : (patch) => editRfq(turn.result, patch)}
                onBuyPlan={() =>
                  openDeal(
                    turn.result,
                    turn.result.plan.lines.map((l) => l.lotId),
                    turn.result.policy.autoNegotiate
                  )
                }
              />
            )
          )}

          {loading && <ThinkingBubble />}
          {error && (
            <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="border-t border-ink-line bg-ink/50 p-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Describe your shop… e.g. 'Y2K thrift shop in Shoreditch, £2000 budget'"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-ink-line bg-ink px-4 py-3 text-sm text-paper placeholder:text-paper/40 focus:border-brand-500/60 focus:outline-none"
            />
            <button type="submit" disabled={loading || !input.trim()} className="btn-primary h-11 px-5">
              {loading ? "…" : "Send"}
            </button>
          </div>
          {!started && (
            <div className="mt-2 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="chip hover:border-brand-500/60 hover:text-brand-200"
                >
                  {s.length > 42 ? `${s.slice(0, 42)}…` : s}
                </button>
              ))}
            </div>
          )}
        </form>
      </section>

      {deal && <DealModal {...deal} onClose={() => setDeal(null)} />}
    </div>
  );
}

function AgentMessage({
  result,
  onBuy,
  onNegotiate,
  onBuyPlan,
  onEditRfq,
  disabled
}: {
  result: AgentResult;
  onBuy: (m: ProcuredLot) => void;
  onNegotiate: (m: ProcuredLot) => void;
  onBuyPlan: () => void;
  onEditRfq?: (patch: RfqPatch) => void;
  disabled?: boolean;
}) {
  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex gap-3">
        <AgentAvatar />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">LotPilot</span>
            <span className="chip">
              {result.source === "llm" ? `LLM · ${result.llmModel ?? "live"}` : "Deterministic"}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-paper/85">{result.summary}</p>
        </div>
      </div>

      {result.store && <StoreProfileCard store={result.store} />}

      {result.rfq && <RfqSummaryCard rfq={result.rfq} onEdit={onEditRfq} disabled={disabled} />}

      <SourcingPlanCard plan={result.plan} onBuyPlan={onBuyPlan} disabled={disabled} />

      {result.matches.length > 0 && (
        <MatchesPanel
          matches={result.matches}
          onBuy={onBuy}
          onNegotiate={onNegotiate}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function StoreUrlInput({
  onAnalyse,
  disabled
}: {
  onAnalyse: (url: string) => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState("");

  function analyse(value = url) {
    if (!value.trim() || disabled) return;
    onAnalyse(value);
    setUrl("");
  }

  return (
    <div className="mt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyse();
        }}
        className="flex gap-2"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourstore.co.uk"
          inputMode="url"
          aria-label="Store URL"
          className="min-w-0 flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-xs text-paper placeholder:text-paper/40 focus:border-brand-500/60 focus:outline-none"
        />
        <button type="submit" disabled={disabled || !url.trim()} className="btn-primary px-3 py-2 text-xs">
          Analyse
        </button>
      </form>
      <div className="mt-2.5 text-[10px] uppercase tracking-wide text-paper/40">Demo stores</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {DEMO_STORE_URLS.map((demo) => (
          <button
            key={demo}
            type="button"
            onClick={() => analyse(demo)}
            disabled={disabled}
            className="chip py-0.5 transition hover:border-brand-500/60 hover:text-brand-200 disabled:opacity-50"
          >
            {demo}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (brief: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <AgentAvatar large />
      <h2 className="mt-4 font-display text-2xl">Describe your shop</h2>
      <p className="mt-2 max-w-md text-sm text-paper/60">
        LotPilot reads your store DNA, scans the wholesale catalog, and ranks lots by fit and
        projected margin. Pick a persona on the left or type a brief below.
      </p>
      <button onClick={() => onPick(SUGGESTIONS[0])} className="btn-primary mt-5">
        Try the Shoreditch Y2K example
      </button>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <AgentAvatar />
      <div className="rounded-2xl rounded-tl-sm bg-ink/70 px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-paper/70">
          <span>Scanning the wholesale floor</span>
          <Dot /> <Dot delay="0.2s" /> <Dot delay="0.4s" />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-brand-400"
      style={{ animationDelay: delay }}
    />
  );
}

function AgentAvatar({ large }: { large?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl bg-brand-500 text-onbrand shadow-glow ${
        large ? "h-12 w-12" : "h-9 w-9"
      }`}
    >
      <svg viewBox="0 0 24 24" className={large ? "h-7 w-7" : "h-5 w-5"} fill="none">
        <path d="M3 20 12 4l9 16-9-4-9 4Z" fill="currentColor" />
      </svg>
    </span>
  );
}
