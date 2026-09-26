import { NextResponse } from "next/server";
import { DEFAULT_BUDGET } from "@/lib/agent";
import { negotiateBasket } from "@/lib/checkout";
import { sanitizePolicy } from "@/lib/procurement/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const lotIds: string[] = (Array.isArray(body?.lotIds) ? body.lotIds : [])
      .filter((id: unknown): id is string => typeof id === "string")
      .slice(0, 12);
    if (lotIds.length === 0) {
      return NextResponse.json({ error: "Missing lotIds." }, { status: 400 });
    }

    const budget = Number(body?.budget) > 0 ? Number(body.budget) : DEFAULT_BUDGET;
    const deals = negotiateBasket(lotIds, sanitizePolicy(body?.policy), budget, true);
    return NextResponse.json({
      deals: deals.map((d) => ({
        lotId: d.lot.id,
        title: d.lot.title,
        wholesaler: d.lot.wholesaler,
        listPrice: d.lot.wholesalePrice,
        status: d.status,
        reason: d.reason,
        price: d.price,
        negotiation: d.negotiation
      }))
    });
  } catch {
    return NextResponse.json({ error: "Negotiation failed. Try again." }, { status: 500 });
  }
}
