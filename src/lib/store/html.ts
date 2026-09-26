import { parse, type HTMLElement } from "node-html-parser";
import type { JsonLdBusiness, Platform, SeoData } from "@/lib/store/types";

export interface ParsedPage {
  seo: SeoData;
  platform: Platform;
  navCategories: string[];
  business: JsonLdBusiness | null;
}

const NAV_PATH = /\/(collections|collection|product-category|category|categories|shop|c)\/([^/?#]+)/i;
const JUNK = /^(all|view all|shop all|see all|home|sale|new|new in|search|account|cart|login|sign in|frontpage|gift card|gift cards|shop|menu|more)$/i;

const PLATFORM_MARKERS: [Platform, RegExp][] = [
  ["shopify", /cdn\.shopify\.com|Shopify\.theme|myshopify\.com/i],
  ["woocommerce", /woocommerce|wp-content\/plugins\/woo/i],
  ["squarespace", /squarespace\.com|static1\.squarespace/i],
  ["wix", /wix\.com|wixstatic\.com/i],
  ["bigcommerce", /bigcommerce\.com|cdn11\.bigcommerce/i]
];

const clean = (s?: string | null) => s?.replace(/\s+/g, " ").trim() || undefined;

export function detectPlatform(html: string, domain: string): Platform {
  if (domain.endsWith(".myshopify.com")) return "shopify";
  return PLATFORM_MARKERS.find(([, re]) => re.test(html))?.[0] ?? "unknown";
}

export function parsePage(html: string, domain: string): ParsedPage {
  const root = parse(html, { blockTextElements: { script: true, style: false } });
  const meta = (attr: "name" | "property", key: string) =>
    clean(root.querySelector(`meta[${attr}="${key}"]`)?.getAttribute("content"));

  const jsonLd = readJsonLd(root);

  const seo: SeoData = {
    title: clean(root.querySelector("title")?.text),
    description: meta("name", "description"),
    keywords: (meta("name", "keywords") ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 20),
    ogTitle: meta("property", "og:title"),
    ogDescription: meta("property", "og:description"),
    ogImage: meta("property", "og:image"),
    ogSiteName: meta("property", "og:site_name"),
    ogType: meta("property", "og:type"),
    twitterDescription: meta("name", "twitter:description"),
    canonical: clean(root.querySelector('link[rel="canonical"]')?.getAttribute("href")),
    lang: clean(root.querySelector("html")?.getAttribute("lang")),
    jsonLdTypes: [...new Set(jsonLd.flatMap((n) => types(n)))]
  };

  return {
    seo,
    platform: detectPlatform(html, domain),
    navCategories: readNavCategories(root),
    business: readBusiness(jsonLd)
  };
}

function readNavCategories(root: HTMLElement): string[] {
  const seen = new Map<string, string>();
  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    const m = href.match(NAV_PATH);
    if (!m) continue;
    const text = clean(a.text) ?? decodeURIComponent(m[2]).replace(/[-_]+/g, " ");
    if (!text || text.length > 40 || JUNK.test(text)) continue;
    const key = text.toLowerCase();
    if (!seen.has(key)) seen.set(key, titleCase(text));
  }
  return [...seen.values()].slice(0, 24);
}

type JsonNode = Record<string, unknown>;

function readJsonLd(root: HTMLElement): JsonNode[] {
  return root
    .querySelectorAll('script[type="application/ld+json"]')
    .flatMap((s) => {
      try {
        const data = JSON.parse(s.text);
        const list = Array.isArray(data) ? data : [data];
        return list.flatMap((n: JsonNode) =>
          Array.isArray(n?.["@graph"]) ? (n["@graph"] as JsonNode[]) : [n]
        );
      } catch {
        return [];
      }
    })
    .filter((n): n is JsonNode => Boolean(n) && typeof n === "object");
}

const types = (n: JsonNode): string[] =>
  ([] as unknown[]).concat(n["@type"] ?? []).filter((t): t is string => typeof t === "string");

const BUSINESS_TYPES = /Store|LocalBusiness|Organization|ClothingStore|ShoeStore|ElectronicsStore/;

function readBusiness(nodes: JsonNode[]): JsonLdBusiness | null {
  const biz = nodes.filter((n) => types(n).some((t) => BUSINESS_TYPES.test(t)));
  if (biz.length === 0) return null;

  const withAddress = biz.filter((n) => n.address);
  const primary = withAddress[0] ?? biz[0];
  const address = (primary.address ?? {}) as JsonNode;
  const rating = (primary.aggregateRating ?? {}) as JsonNode;
  const department = Array.isArray(primary.department) ? primary.department.length : 0;

  return {
    name: typeof primary.name === "string" ? primary.name : undefined,
    locality: typeof address.addressLocality === "string" ? address.addressLocality : undefined,
    address:
      [address.streetAddress, address.addressLocality, address.postalCode]
        .filter((p): p is string => typeof p === "string")
        .join(", ") || undefined,
    rating: Number(rating.ratingValue) || undefined,
    reviewCount: Number(rating.reviewCount ?? rating.ratingCount) || undefined,
    locations: Math.max(withAddress.length, department + 1, 1)
  };
}

function titleCase(s: string): string {
  return s.replace(/(^|[\s(/-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase());
}
