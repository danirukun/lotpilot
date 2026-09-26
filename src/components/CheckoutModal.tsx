"use client";

import { useEffect, useState } from "react";
import { gbp, formatDate } from "@/lib/format";
import { track } from "@/lib/analytics";
import type { LotScore, Order } from "@/lib/types";

type Phase = "review" | "placing" | "confirmed" | "error";

export function CheckoutModal({
  match,
  onClose
}: {
  match: LotScore;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("review");
  const [order, setOrder] = useState<Order | null>(null);
  const { lot, economics } = match;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function placeOrder() {
    setPhase("placing");
    track("checkout_started", { lotId: lot.id, amount: lot.wholesalePrice });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lotId: lot.id })
      });
      if (!res.ok) throw new Error("checkout failed");
      const data = await res.json();
      // Small delay so the "placing" state reads as real agent work.
      await new Promise((r) => setTimeout(r, 700));
      setOrder(data.order as Order);
      setPhase("confirmed");
      track("checkout_confirmed", { lotId: lot.id, orderId: data.order?.id });
    } catch {
      setPhase("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lot.image} alt={lot.title} className="h-32 w-full object-cover" />

        <div className="p-6">
          {phase === "confirmed" && order ? (
            <ConfirmedView order={order} onClose={onClose} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="label-eyebrow">Wholesale checkout</span>
                <button
                  onClick={onClose}
                  className="text-paper/50 hover:text-paper"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <h3 className="mt-2 font-display text-2xl">{lot.title}</h3>
              <p className="text-sm text-paper/60">{lot.wholesaler}</p>

              <dl className="mt-4 space-y-2 rounded-xl border border-ink-line bg-ink/50 p-4 text-sm">
                <Row label="Pieces" value={`${lot.pieceCount} · Grade ${lot.grade}`} />
                <Row label="Price per piece" value={gbp(economics.pricePerPiece)} />
                <Row label="Projected resale" value={gbp(economics.projectedRevenue)} />
                <Row label="Projected profit" value={gbp(economics.projectedProfit)} accent />
                <div className="my-1 border-t border-ink-line" />
                <Row label="Total to pay" value={gbp(lot.wholesalePrice)} strong />
              </dl>

              {phase === "error" && (
                <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
                  Something went wrong placing the order. Please try again.
                </p>
              )}

              <button
                onClick={placeOrder}
                disabled={phase === "placing"}
                className="btn-primary mt-5 w-full py-3"
              >
                {phase === "placing" ? "Placing order…" : `Place wholesale order`}
              </button>
              <p className="mt-2 text-center text-xs text-paper/40">
                Simulated checkout · no real payment is taken
              </p>
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
          <path
            d="m5 13 4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-2xl">Order confirmed</h3>
      <p className="mt-1 text-sm text-paper/60">
        LotPilot placed the buy for {order.lotTitle}.
      </p>

      <dl className="mt-5 space-y-2 rounded-xl border border-ink-line bg-ink/50 p-4 text-left text-sm">
        <Row label="Order ID" value={order.id} />
        <Row label="Wholesaler" value={order.wholesaler} />
        <Row label="Amount" value={gbp(order.amount)} strong />
        <Row label="Est. delivery" value={formatDate(order.estimatedDelivery)} />
        <Row
          label="Rail"
          value={order.source === "commerce-layer" ? "Commerce Layer" : "Mock order"}
        />
      </dl>

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
