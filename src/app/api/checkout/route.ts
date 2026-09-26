import { NextResponse } from "next/server";
import { DEFAULT_BUDGET } from "@/lib/agent";
import { createOrder } from "@/lib/checkout";
import { sanitizePolicy } from "@/lib/procurement/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const lotIds = parseLotIds(body);
    if (lotIds.length === 0) {
      return NextResponse.json({ error: "Missing lotIds." }, { status: 400 });
    }

    const budget = Number(body?.budget) > 0 ? Number(body.budget) : DEFAULT_BUDGET;
    const order = createOrder(lotIds, sanitizePolicy(body?.policy), budget, Boolean(body?.negotiate));
    if (order.lines.length === 0) {
      return NextResponse.json(
        { error: "No lot in the basket clears your buying policy.", order },
        { status: 422 }
      );
    }
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Checkout failed. Try again." }, { status: 500 });
  }
}

function parseLotIds(body: Record<string, unknown>): string[] {
  const ids = Array.isArray(body?.lotIds) ? body.lotIds : body?.lotId ? [body.lotId] : [];
  return ids.filter((id): id is string => typeof id === "string").slice(0, 12);
}
