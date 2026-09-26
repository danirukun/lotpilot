import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Directory sources are not verified inventory. Never accept seeded lot IDs. */
export async function POST(_req: Request) {
  return NextResponse.json({ error: "No verified purchasable inventory is connected. Supplier leads cannot be negotiated or ordered here." }, { status: 409 });
}
