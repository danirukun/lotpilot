import type { Category, StoreDNA } from "@/lib/types";
import type { Vertical } from "@/lib/store/types";

/** Curated UK wholesale directory entries (The Wholesaler UK and related). */
export interface WholesaleIndexEntry {
  id: string;
  name: string;
  url: string;
  /** Directory category label shown in the UI. */
  category: string;
  index: "thewholesaler";
  verticals: Vertical[];
  categories: Category[];
  aesthetics: string[];
  /** Short plain note for retailers. */
  blurb: string;
}

/**
 * Seeded matches against https://www.thewholesaler.co.uk/
 * so demos stay offline-deterministic when Tavily is absent.
 */
export const WHOLESALE_INDEX: WholesaleIndexEntry[] = [
  {
    id: "tw-clothing",
    name: "Clothing Wholesale UK",
    url: "https://www.thewholesaler.co.uk/clothing-wholesale/",
    category: "Clothing & fashion",
    index: "thewholesaler",
    verticals: ["clothing", "general"],
    categories: ["tees-tops", "dresses", "denim", "outerwear", "knitwear"],
    aesthetics: ["vintage", "y2k", "streetwear", "minimal", "grunge"],
    blurb: "UK clothing wholesalers for indie fashion retailers."
  },
  {
    id: "tw-footwear",
    name: "Footwear wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/clothing_and_fashion/footwear/",
    category: "Footwear",
    index: "thewholesaler",
    verticals: ["footwear", "clothing"],
    categories: ["footwear"],
    aesthetics: ["streetwear", "sportswear", "y2k"],
    blurb: "Trade footwear distributors listed for UK retail."
  },
  {
    id: "tw-scarves",
    name: "Scarves wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/clothing_and_fashion/scarves/",
    category: "Accessories",
    index: "thewholesaler",
    verticals: ["accessories", "clothing"],
    categories: ["accessories"],
    aesthetics: ["vintage", "preppy", "boho"],
    blurb: "Scarves and related neckwear for accessory rails."
  },
  {
    id: "tw-hats",
    name: "Hats & headwear wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/clothing_and_fashion/hats_and_headwear/",
    category: "Accessories",
    index: "thewholesaler",
    verticals: ["accessories", "clothing"],
    categories: ["accessories"],
    aesthetics: ["streetwear", "vintage", "sportswear"],
    blurb: "Caps, hats and headwear for street and sports shops."
  },
  {
    id: "tw-bags",
    name: "Bags & handbags wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/fashion_accessories/bags_and_handbags/",
    category: "Fashion accessories",
    index: "thewholesaler",
    verticals: ["accessories", "clothing"],
    categories: ["accessories"],
    aesthetics: ["minimal", "y2k", "boho"],
    blurb: "Bags and handbags from UK trade suppliers."
  },
  {
    id: "tw-football",
    name: "Football merchandise wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/hobbies_and_pastimes/football/",
    category: "Football",
    index: "thewholesaler",
    verticals: ["sports-outdoor", "clothing"],
    categories: ["sportswear", "tees-tops"],
    aesthetics: ["football", "sportswear", "vintage"],
    blurb: "Football kits, scarves and terrace goods for specialist shops."
  },
  {
    id: "tw-sports",
    name: "Sports goods wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/hobbies_and_pastimes/sports_goods/",
    category: "Sports",
    index: "thewholesaler",
    verticals: ["sports-outdoor"],
    categories: ["sportswear", "footwear"],
    aesthetics: ["sportswear", "gorpcore", "athleisure"],
    blurb: "Broader sports merchandise for outdoor and athletic retail."
  },
  {
    id: "tw-phones",
    name: "Mobile phone wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/electronics_and_communications/mobile_phone/",
    category: "Electronics",
    index: "thewholesaler",
    verticals: ["electronics"],
    categories: ["smartphones", "cables-accessories"],
    aesthetics: [],
    blurb: "Mobile phones and related trade stock."
  },
  {
    id: "tw-computers",
    name: "Computer wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/electronics_and_communications/computers/",
    category: "Electronics",
    index: "thewholesaler",
    verticals: ["electronics"],
    categories: ["laptops", "tablets", "cables-accessories"],
    aesthetics: [],
    blurb: "Computers and laptop trade suppliers."
  },
  {
    id: "tw-gadgets",
    name: "Gadgets wholesalers",
    url: "https://www.thewholesaler.co.uk/suppliers/electronics_and_communications/gadgets/",
    category: "Electronics",
    index: "thewholesaler",
    verticals: ["electronics"],
    categories: ["headphones", "gaming", "refurb-mixed", "cables-accessories"],
    aesthetics: [],
    blurb: "Gadgets and consumer electronics for indie tech shops."
  },
  {
    id: "tw-directory",
    name: "The Wholesaler UK trade directory",
    url: "https://www.thewholesaler.co.uk/trade-directory/",
    category: "Directory",
    index: "thewholesaler",
    verticals: ["general", "clothing", "home", "beauty"],
    categories: [],
    aesthetics: [],
    blurb: "A to Z UK wholesaler directory for independent retailers."
  }
];
