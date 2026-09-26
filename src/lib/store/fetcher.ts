const MAX_BYTES = 1_500_000;
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
export async function fetchText(url: string, timeoutMs = 6000): Promise<string | null> {
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
        headers: { "User-Agent": UA, Accept: "text/html,application/json;q=0.9,*/*;q=0.5" }
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
