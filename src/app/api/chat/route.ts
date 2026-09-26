import { NextResponse } from "next/server";
import { runAgent, runAgentForStore } from "@/lib/agent";
import { normalizeUrl } from "@/lib/store/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const brief = typeof body?.brief === "string" ? body.brief : "";
    const storeUrl = typeof body?.storeUrl === "string" ? body.storeUrl.trim() : "";

    if (storeUrl) {
      if (!normalizeUrl(storeUrl)) {
        return NextResponse.json({ error: "Enter a public store URL, e.g. neonrewind.co.uk" }, { status: 400 });
      }
      return NextResponse.json(await runAgentForStore(storeUrl, body?.policy));
    }

    if (!brief.trim()) {
      return NextResponse.json({ error: "Tell me about your store first." }, { status: 400 });
    }

    const result = await runAgent(brief, body?.policy, { rfq: body?.rfq, personaId: body?.personaId });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "The agent hit a snag. Try again." }, { status: 500 });
  }
}
