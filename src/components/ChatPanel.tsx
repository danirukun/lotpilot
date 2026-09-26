"use client";

import { useEffect, useRef, useState } from "react";
import { LotCard } from "@/components/LotCard";
import { DealModal, type DealItem } from "@/components/DealModal";
import { PolicyPanel } from "@/components/PolicyPanel";
import { SourcingPlanCard } from "@/components/SourcingPlanCard";
import { PERSONAS } from "@/data/personas";
import { LOTS } from "@/data/lots";
import { track } from "@/lib/analytics";
import { DEFAULT_POLICY } from "@/lib/procurement/policy";
import type { BuyingPolicy, ProcuredLot } from "@/lib/procurement/types";
import type { AgentResult } from "@/lib/types";

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
  const [lastBrief, setLastBrief] = useState<string | null>(null);
  const [deal, setDeal] = useState<ActiveDeal | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function submit(brief: string) {
    const clean = brief.trim();
    if (!clean || loading) return;
    setError(null);
    setInput("");
    setTurns((t) => [...t, { role: "user", text: clean }]);
    setLastBrief(clean);
    setLoading(true);
    track("brief_submitted", { length: clean.length });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: clean, policy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Agent error");
      setTurns((t) => [...t, { role: "agent", result: data as AgentResult }]);
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

  const openDeal = (result: AgentResult, lotIds: string[], negotiate: boolean) =>
    setDeal({ items: lotIds.map(toItem), negotiate, policy: result.policy, budget: result.plan.budget });

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-4">
        <div className="card p-4">
          <h2 className="text-sm font-semibold">Store personas</h2>
          <p className="mt-1 text-xs text-paper/55">One click to load a store brief.</p>
          <div className="mt-3 space-y-2">
            {PERSONAS.map((p) => (
              <div key={p.id} className="relative">
                <button
                  onClick={() => submit(p.brief)}
                  disabled={loading}
                  title={p.brief}
                  className="flex w-full items-start gap-3 rounded-xl border border-ink-line bg-ink/40 px-3 py-2 text-left transition hover:border-brand-500/60 hover:bg-ink/70 disabled:opacity-50"
                >
                  <span className="text-xl leading-6">{p.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-paper/50">{p.location}</span>
                    <span className="mt-1 block text-xs leading-snug text-paper/70">{p.blurb}</span>
                    {p.url && <span className="block h-4" aria-hidden />}
                  </span>
                </button>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 left-12 text-[11px] text-brand-300 hover:underline"
                  >
                    {new URL(p.url).hostname.replace(/^www\./, "")} ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold">Infer from a store URL</h2>
          <p className="mt-1 text-xs text-paper/55">
            Paste a Shopify / store URL — the agent reads the handle for taste cues.
          </p>
          <ShopifyInput onInfer={submit} disabled={loading} />
        </div>

        <PolicyPanel
          policy={policy}
          onChange={setPolicy}
          canApply={Boolean(lastBrief) && !loading}
          onApply={() => {
            if (!lastBrief) return;
            track("policy_applied", { ...policy });
            submit(lastBrief);
          }}
        />
      </aside>

      {/* Conversation */}
      <section className="card flex h-[80vh] min-h-[600px] flex-col overflow-hidden lg:sticky lg:top-20">
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
  disabled
}: {
  result: AgentResult;
  onBuy: (m: ProcuredLot) => void;
  onNegotiate: (m: ProcuredLot) => void;
  onBuyPlan: () => void;
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

      <SourcingPlanCard plan={result.plan} onBuyPlan={onBuyPlan} disabled={disabled} />

      {result.matches.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {result.matches.map((m, idx) => (
            <LotCard
              key={m.lot.id}
              match={m}
              rank={idx}
              onBuy={onBuy}
              onNegotiate={onNegotiate}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ShopifyInput({
  onInfer,
  disabled
}: {
  onInfer: (brief: string) => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState("");

  function infer() {
    const handle = url
      .replace(/^https?:\/\//, "")
      .split(/[./]/)
      .filter(Boolean)[0];
    if (!handle) return;
    const words = handle.replace(/[-_]/g, " ");
    onInfer(
      `Infer my store taste from my shop name "${words}". Suggest wholesale lots that match a vintage / secondhand fashion store with that vibe.`
    );
    setUrl("");
  }

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && infer()}
        placeholder="yourstore.myshopify.com"
        className="min-w-0 flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-xs text-paper placeholder:text-paper/40 focus:border-brand-500/60 focus:outline-none"
      />
      <button onClick={infer} disabled={disabled || !url.trim()} className="btn-ghost px-3 py-2 text-xs">
        Infer
      </button>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (brief: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <AgentAvatar large />
      <h2 className="mt-4 font-display text-2xl">Tell me about your shop.</h2>
      <p className="mt-2 max-w-md text-sm text-paper/60">
        I&apos;ll read your store DNA, scan the wholesale floor, and rank lots by fit and
        projected margin. Try a persona on the left or describe your store below.
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
      className={`grid shrink-0 place-items-center rounded-xl bg-brand-500 text-ink shadow-glow ${
        large ? "h-12 w-12" : "h-9 w-9"
      }`}
    >
      <svg viewBox="0 0 24 24" className={large ? "h-7 w-7" : "h-5 w-5"} fill="none">
        <path d="M3 20 12 4l9 16-9-4-9 4Z" fill="currentColor" />
      </svg>
    </span>
  );
}
