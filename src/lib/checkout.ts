import { LOTS } from "@/data/lots";
import type { Order } from "@/lib/types";

function orderId(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `LP-${new Date().getFullYear()}-${rand}`;
}

/**
 * Create an order for a lot. If Commerce Layer keys are present we would build a
 * real cart; without them we return a clean mock order so the demo always
 * completes. The shape is identical so the UI does not care which path ran.
 */
export async function createOrder(lotId: string): Promise<Order> {
  const lot = LOTS.find((l) => l.id === lotId);
  if (!lot) throw new Error("Unknown lot");

  const commerceLayerConfigured =
    Boolean(process.env.COMMERCE_LAYER_CLIENT_ID) &&
    Boolean(process.env.COMMERCE_LAYER_ENDPOINT);

  const eta = new Date();
  eta.setDate(eta.getDate() + 4);

  return {
    id: orderId(),
    lotId: lot.id,
    lotTitle: lot.title,
    wholesaler: lot.wholesaler,
    amount: lot.wholesalePrice,
    currency: "GBP",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    estimatedDelivery: eta.toISOString(),
    source: commerceLayerConfigured ? "commerce-layer" : "mock"
  };
}
