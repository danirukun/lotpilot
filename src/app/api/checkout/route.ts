import { NextResponse } from "next/server";
import { createOrder } from "@/lib/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const lotId = typeof body?.lotId === "string" ? body.lotId : "";

    if (!lotId) {
      return NextResponse.json({ error: "Missing lotId." }, { status: 400 });
    }

    const order = await createOrder(lotId);
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Checkout failed. Try again." }, { status: 500 });
  }
}
