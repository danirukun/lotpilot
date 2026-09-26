import { NextResponse } from "next/server";
import { runAgent, runAgentForStore } from "@/lib/agent";
import { normalizeUrl } from "@/lib/store/fetcher";
import type { AgentEvent, ProgressReporter } from "@/lib/progress";

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
    }

    if (!storeUrl && !brief.trim()) {
      return NextResponse.json({ error: "Tell me about your store first." }, { status: 400 });
    }

    const run = (onProgress?: ProgressReporter) => storeUrl
      ? runAgentForStore(storeUrl, body?.policy, { refresh: body?.refresh === true, onProgress })
      : runAgent(brief, body?.policy, {
          rfq: body?.rfq, personaId: body?.personaId, refresh: body?.refresh === true, onProgress
        });

    if (!req.headers.get("accept")?.includes("application/x-ndjson")) {
      return NextResponse.json(await run());
    }

    let closed = false;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: AgentEvent) => {
          if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        try {
          const result = await run(progress => send({ type: "progress", ...progress }));
          send({ type: "result", result });
        } catch {
          send({ type: "error", error: "The agent hit a snag. Try again." });
        } finally {
          if (!closed) { closed = true; controller.close(); }
        }
      },
      cancel() { closed = true; }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no"
      }
    });
  } catch {
    return NextResponse.json({ error: "The agent hit a snag. Try again." }, { status: 500 });
  }
}
