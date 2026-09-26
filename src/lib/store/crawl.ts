import { fetchText, isStorePage } from "./fetcher";
import { parsePage, type ParsedPage } from "./html";

export interface CrawledPage { url: string; page: ParsedPage }

/** One bounded hop: meaningful site links, never arbitrary URLs from page text. */
export async function readStorePages(url: URL, first: ParsedPage): Promise<CrawledPage[]> {
  const score = (text: string) => /stock|vintage|collection|products?/i.test(text) ? 3 : /shop|about/i.test(text) ? 2 : /traders|visit/i.test(text) ? 1 : 0;
  const identity = (target: URL) => target.hostname.replace(/^www\./, "") + target.pathname.replace(/\/$/, "");
  const seen = new Set([identity(url)]);
  const candidates = first.links.map(link => {
    try {
      const target = new URL(link.href, url);
      target.hash = "";
      if (target.hostname.replace(/^www\./, "") !== url.hostname.replace(/^www\./, "") || !["http:", "https:"].includes(target.protocol) || Boolean(target.port) || target.search || /\.(pdf|jpg|png|zip)$/i.test(target.pathname)) return null;
      const key = identity(target);
      if (seen.has(key)) return null;
      seen.add(key);
      return { url: target.toString(), priority: score(`${link.text} ${target.pathname}`) };
    } catch { return null; }
  }).filter((v): v is { url: string; priority: number } => Boolean(v && v.priority > 0))
    .sort((a, b) => b.priority - a.priority).slice(0, 4);
  const extra = await Promise.all(candidates.map(async target => {
    const html = await fetchText(target.url, 5000);
    return html && isStorePage(html) ? { url: target.url, page: parsePage(html, url.hostname) } : null;
  }));
  return [{ url: url.toString(), page: first }, ...extra.filter((p): p is CrawledPage => p !== null)];
}
