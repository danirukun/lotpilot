"use client";

import { useEffect, useMemo, useState } from "react";
import { gbp, formatDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import type { BuyingPolicy, NegotiationResult } from "@/lib/procurement/types";
import type { Order } from "@/lib/types";

export interface DealItem {
  lotId: string;
  title: string;
  wholesaler: string;
  listPrice: number;
  image: string;
}

interface Deal {
  lotId: string;
  title: string;
  wholesaler: string;
  listPrice: number;
  status: "ok" | "rejected";
  reason?: string;
  price: number;
  negotiation: NegotiationResult | null;
}

type Phase = "negotiating" | "review" | "placing" | "confirmed" | "error";

export function DealModal({
  items,
  policy,
  budget,
  negotiate,
  onClose
}: {
  items: DealItem[];
  policy: BuyingPolicy;
  budget: number;
  negotiate: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(negotiate ? "negotiating" : "review");
  const [deals, setDeals] = useState<Deal[]>(() =>
    items.map((i) => ({ ...i, status: "ok", price: i.listPrice, negotiation: null }))
  );
  const [revealed, setRevealed] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lotIds = useMemo(() => items.map((i) => i.lotId), [items]);

  const totalMessages = deals.reduce((n, d) => n + (d.negotiation?.rounds.length ?? 0), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!negotiate) return;
    let cancelled = false;
    track("negotiation_started", { lots: lotIds.length });
    fetch("/api/negotiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lotIds, policy, budget })
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("negotiation failed"))))
      .then((data) => !cancelled && setDeals(data.deals as Deal[]))
      .catch(() => {
        if (!cancelled) {
          setError("Negotiation failed. Please try again.");
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [negotiate, lotIds, policy, budget]);

  useEffect(() => {
    if (phase !== "negotiating" || totalMessages === 0) return;
    if (revealed >= totalMessages) {
      const t = setTimeout(() => setPhase("review"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), lotIds.length > 1 ? 260 : 520);
    return () => clearTimeout(t);
  }, [phase, revealed, totalMessages, lotIds.length]);

  useEffect(() => {
    if (phase !== "review") return;
    const agreed = deals.filter((d) => d.negotiation?.status === "agreed");
    if (agreed.length) {
      track("negotiation_completed", {
        lots: agreed.length,
        savings: agreed.reduce((s, d) => s + (d.negotiation?.savings ?? 0), 0)
      });
    }
  }, [phase, deals]);

  async function placeOrder() {
    setPhase("placing");
    track("checkout_started", { lots: lotIds.length });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotIds, policy, budget, negotiate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout failed.");
      await new Promise((r) => setTimeout(r, 600));
      setOrder(data.order as Order);
      setPhase("confirmed");
      track("checkout_confirmed", { orderId: data.order?.id, amount: data.order?.amount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setPhase("error");
    }
  }

  const accepted = deals.filter((d) => d.status === "ok");
  const listTotal = accepted.reduce((s, d) => s + d.listPrice, 0);
  const dealTotal = accepted.reduce((s, d) => s + d.price, 0);
  const single = items.length === 1 ? items[0] : null;

  let cursor = 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {single && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={single.image} alt={single.title} className="h-24 w-full shrink-0 object-cover" />
        )}

        <div className="scroll-slim overflow-y-auto p-6">
          {phase === "confirmed" && order ? (
            <ConfirmedView order={order} onClose={onClose} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="label-eyebrow">
                  {phase === "negotiating" ? "Agent negotiating" : "Wholesale checkout"}
                </span>
                <button onClick={onClose} className="text-paper/50 hover:text-paper" aria-label="Close">
                  ✕
                </button>
              </div>
              <h3 className="mt-2 font-display text-2xl">
                {single ? single.title : `Sourcing plan · ${items.length} lots`}
              </h3>
              {single && <p className="text-sm text-paper/60">{single.wholesaler}</p>}

              {negotiate && (
                <div className="mt-4 space-y-4">
                  {deals.map((d) => {
                    const rounds = d.negotiation?.rounds ?? [];
                    const start = cursor;
                    cursor += rounds.length;
                    const shown =
                      phase === "negotiating" ? Math.max(0, Math.min(rounds.length, revealed - start)) : rounds.length;
                    return (
                      <div key={d.lotId}>
                        {!single && (
                          <div className="mb-1.5 text-xs font-semibold text-paper/80">{d.title}</div>
                        )}
                        <div className="space-y-1.5">
                          {rounds.slice(0, shown).map((r, i) => (
                            <div
                              key={i}
                              className={`flex animate-fade-up ${r.party === "buyer" ? "justify-end" : ""}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                                  r.party === "buyer"
                                    ? "rounded-tr-sm bg-brand-500/20 text-brand-50"
                                    : "rounded-tl-sm bg-ink/70 text-paper/85"
                                }`}
                              >
                                <div className="mb-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wide text-paper/45">
                                  {r.party === "buyer" ? "LotPilot" : d.wholesaler.split(" (")[0]}
                                  <span className="font-semibold text-paper/80">{gbp(r.amount)}</span>
                                  {r.levers.map((l) => (
                                    <span key={l} className="rounded bg-accent-500/20 px-1 text-accent-400">
                                      {l}
                                    </span>
                                  ))}
                                </div>
                                {r.message}
                              </div>
                            </div>
                          ))}
                          {phase !== "negotiating" && d.status === "rejected" && (
                            <p className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-300">
                              {d.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {phase === "negotiating" && (
                    <div className="flex items-center justify-between text-xs text-paper/50">
                      <span className="animate-blink">
                        {totalMessages === 0 ? "Opening the deal room…" : "Negotiating within your policy…"}
                      </span>
                      {totalMessages > 0 && (
                        <button onClick={() => setRevealed(totalMessages)} className="underline">
                          Skip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {phase !== "negotiating" && (
                <>
                  <dl className="mt-4 space-y-2 rounded-xl border border-ink-line bg-ink/50 p-4 text-sm">
                    <Row label="Lots" value={`${accepted.length} of ${items.length}`} />
                    <Row label="List price" value={gbp(listTotal)} />
                    <Row label="Negotiated savings" value={`− ${gbp(listTotal - dealTotal)}`} accent />
                    <div className="my-1 border-t border-ink-line" />
                    <Row label="Goods total (ex. shipping)" value={gbp(dealTotal)} strong />
                  </dl>

                  {error && (
                    <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
                  )}

                  <button
                    onClick={placeOrder}
                    disabled={phase === "placing" || accepted.length === 0}
                    className="btn-primary mt-5 w-full py-3"
                  >
                    {phase === "placing"
                      ? "Placing order…"
                      : accepted.length === 0
                        ? "Nothing clears your policy"
                        : `Place order for ${gbp(dealTotal)}`}
                  </button>
                  <p className="mt-2 text-center text-xs text-paper/40">
                    Simulated checkout · no real payment is taken
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmedView({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-500/20">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-brand-400" fill="none">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-2xl">Order confirmed</h3>
      <p className="mt-1 text-sm text-paper/60">
        LotPilot placed {order.lines.length} lot{order.lines.length > 1 ? "s" : ""} inside your buying policy.
      </p>

      <ul className="mt-5 space-y-1.5 rounded-xl border border-ink-line bg-ink/50 p-4 text-left text-sm">
        {order.lines.map((l) => (
          <li key={l.lotId} className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-paper/90">{l.title}</span>
              <span className="text-xs text-paper/45">{l.wholesaler}</span>
            </span>
            <span className="text-right">
              <span className="block font-semibold">{gbp(l.price)}</span>
              {l.negotiated && (
                <span className="text-xs text-paper/40 line-through">{gbp(l.listPrice)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-2 rounded-xl border border-ink-line bg-ink/50 p-4 text-left text-sm">
        <Row label="Order ID" value={order.id} />
        <Row label="Saved vs list" value={gbp(order.savings)} accent />
        <Row label="Shipping" value={gbp(order.shipping)} />
        <Row label="Total paid" value={gbp(order.amount)} strong />
        <Row label="Est. delivery" value={formatDate(order.estimatedDelivery)} />
        <Row label="Rail" value={order.source === "commerce-layer" ? "Commerce Layer" : "Mock order"} />
      </dl>

      {order.rejected.length > 0 && (
        <p className="mt-3 text-left text-xs text-paper/50">
          Not bought: {order.rejected.map((r) => `${r.title} (${r.reason})`).join("; ")}
        </p>
      )}

      <button onClick={onClose} className="btn-ghost mt-5 w-full">
        Back to matches
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  accent
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-paper/55">{label}</dt>
      <dd
        className={`text-right ${strong ? "font-semibold text-paper" : ""} ${
          accent ? "text-brand-300" : "text-paper/85"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
