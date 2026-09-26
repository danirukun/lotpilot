import { NextResponse } from "next/server";
import { extractStoreProfile } from "@/lib/store/extract";
import { normalizeUrl } from "@/lib/store/fetcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url : "";
  if (!normalizeUrl(url)) {
    return NextResponse.json({ error: "Enter a public store URL, e.g. neonrewind.co.uk" }, { status: 400 });
  }

  try {
    return NextResponse.json(await extractStoreProfile(url));
  } catch {
    return NextResponse.json({ error: "Could not read that store. Try again." }, { status: 500 });
  }
}
