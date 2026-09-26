const MAX_BYTES = 3_000_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.(local|internal|localhost)$)/i;

export function normalizeUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!url.hostname.includes(".") || PRIVATE_HOST.test(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/** Bounded GET for public storefront pages: timeout, size cap, no private hosts. */
export async function fetchText(url: string, timeoutMs = 6000, headers: Record<string, string> = {}): Promise<string | null> {
  const parsed = normalizeUrl(url);
  if (!parsed) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let target = parsed;
    let res: Response | undefined;
    for (let hop = 0; hop < 5; hop++) {
      res = await fetch(target, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": UA, Accept: "text/html,application/json;q=0.9,*/*;q=0.5", ...headers }
      });
      if (![301, 302, 303, 307, 308].includes(res.status)) break;
      const location = res.headers.get("location");
      await res.body?.cancel().catch(() => undefined);
      const next = location ? normalizeUrl(new URL(location, target).toString()) : null;
      if (!next) return null;
      target = next;
      res = undefined;
    }
    if (!res) return null;
    if (!res.ok || !res.body || (res.url && !normalizeUrl(res.url))) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => undefined);
    if (size >= MAX_BYTES) return null;
    return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 6000): Promise<T | null> {
  const text = await fetchText(url, timeoutMs);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Reject successful HTTP responses that are actually bot challenges. */
export function isStorePage(html: string): boolean {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return /<(?:html|main|article|body)\b/i.test(html)
    && !/attention required|just a moment|access denied|security checkpoint|captcha/i.test(title)
    && !(html.length < 20000 && /verify (?:that )?you are human|checking your browser/i.test(html));
}

/** A reader is a live external source, never a saved profile or domain-specific fixture. */
export async function fetchStorePage(url: string): Promise<{ html: string; mode: "live" | "reader" } | null> {
  const target = normalizeUrl(url);
  if (!target) return null;
  const direct = await fetchText(target.toString());
  if (direct && isStorePage(direct)) return { html: direct, mode: "live" };
  const html = await fetchText(`https://r.jina.ai/${target.toString()}`, 20000, { "X-Respond-With": "html", "User-Agent": "LotPilot/1.0", Accept: "text/plain" });
  return html && isStorePage(html) ? { html, mode: "reader" } : null;
}
