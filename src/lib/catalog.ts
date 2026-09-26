import { LOTS } from "@/data/lots";
import type { StoreProfile } from "@/lib/store/types";
import type { ElectronicsCategory, LotCatalog, WholesaleLot } from "@/lib/types";
import type { Corpus } from "@/lib/store/classify";

const ELECTRONICS_CATEGORY_KEYWORDS: Record<ElectronicsCategory, string[]> = {
  smartphones: ["smartphone", "smartphones", "phone", "iphone", "android", "mobile"],
  laptops: ["laptop", "laptops", "notebook", "macbook"],
  headphones: ["headphone", "headphones", "earbuds", "audio"],
  "cables-accessories": ["charger", "chargers", "cable", "cables", "usb", "accessories"],
  tablets: ["tablet", "tablets", "ipad"],
  gaming: ["gaming", "console", "playstation", "xbox", "nintendo"],
  "refurb-mixed": ["refurbished", "refurb", "tech", "gadget", "electronics"]
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const countTerm = (text: string, kw: string) =>
  (text.match(new RegExp(`\\b${escape(kw)}(?:s|es)?\\b`, "gi")) ?? []).length;

/** Which wholesale catalog to rank for this store profile. */
export function resolveCatalog(store?: StoreProfile): LotCatalog {
  if (store && !store.fashionFit && store.vertical.primary === "electronics") return "electronics";
  return "fashion";
}

export function lotsForCatalog(catalog: LotCatalog): WholesaleLot[] {
  return LOTS.filter((l) => (l.catalog ?? "fashion") === catalog);
}

/** Electronics store DNA categories from extracted corpus text. */
export function deriveElectronicsCategories(corpus: Corpus): ElectronicsCategory[] {
  const text = [corpus.name, corpus.seo, corpus.categories, corpus.catalog].join(" ").toLowerCase();
  const scores = new Map<ElectronicsCategory, number>();
  for (const [cat, kws] of Object.entries(ELECTRONICS_CATEGORY_KEYWORDS)) {
    const hits = kws.reduce((n, kw) => n + countTerm(text, kw), 0);
    if (hits > 0) scores.set(cat as ElectronicsCategory, hits);
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  if (ranked.length > 0) return ranked.slice(0, 4);
  return ["smartphones", "laptops", "headphones", "cables-accessories"];
}
