import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const brief = typeof body?.brief === "string" ? body.brief : "";

    if (!brief.trim()) {
      return NextResponse.json({ error: "Tell me about your store first." }, { status: 400 });
    }

    const result = await runAgent(brief);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "The agent hit a snag. Try again." }, { status: 500 });
  }
}
