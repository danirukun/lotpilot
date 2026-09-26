import type { MapsListing } from "@/lib/store/types";

export interface StoreFixture {
  domains: string[];
  html: string;
  shopify?: {
    collections: { title: string; products_count: number }[];
    products: { product_type: string; tags: string[]; vendor: string }[];
  };
  maps: MapsListing | null;
}

interface PageSpec {
  title: string;
  description: string;
  keywords: string;
  siteName: string;
  image: string;
  nav: [string, string][];
  platformScript: string;
  jsonLd: object;
}

const page = (p: PageSpec) => `<!doctype html>
<html lang="en-GB"><head>
<title>${p.title}</title>
<meta name="description" content="${p.description}">
<meta name="keywords" content="${p.keywords}">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:site_name" content="${p.siteName}">
<meta property="og:type" content="website">
<meta property="og:image" content="${p.image}">
<meta name="twitter:description" content="${p.description}">
<script type="application/ld+json">${JSON.stringify(p.jsonLd)}</script>
${p.platformScript}
</head><body><nav>${p.nav.map(([href, text]) => `<a href="${href}">${text}</a>`).join("")}</nav></body></html>`;

const repeat = <T,>(items: T[], n: number): T[] =>
  Array.from({ length: n }, (_, i) => items[i % items.length]);

export const STORE_FIXTURES: StoreFixture[] = [
  {
    domains: ["neonrewind.co.uk", "neonrewind.myshopify.com"],
    html: page({
      title: "Neon Rewind | Y2K & 90s Vintage Clothing, Shoreditch",
      description:
        "Hand-picked Y2K and 90s vintage clothing from our Shoreditch shop. Baby tees, low-rise jeans, going-out tops and mini skirts.",
      keywords: "y2k, vintage clothing, thrift, shoreditch, baby tee, low rise jeans",
      siteName: "Neon Rewind",
      image: "https://picsum.photos/seed/neon-rewind-og/1200/630",
      nav: [
        ["/collections/baby-tees", "Baby Tees"],
        ["/collections/low-rise-jeans", "Low Rise Jeans"],
        ["/collections/going-out-tops", "Going Out Tops"],
        ["/collections/mini-skirts", "Mini Skirts"],
        ["/collections/y2k-accessories", "Y2K Accessories"],
        ["/collections/all", "Shop All"]
      ],
      platformScript: '<script src="https://cdn.shopify.com/s/files/theme.js"></script>',
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ClothingStore",
        name: "Neon Rewind Vintage",
        address: {
          "@type": "PostalAddress",
          streetAddress: "41 Cheshire Street",
          addressLocality: "Shoreditch, London",
          postalCode: "E2 6EH"
        }
      }
    }),
    shopify: {
      collections: [
        { title: "Baby Tees", products_count: 38 },
        { title: "Low Rise Jeans", products_count: 26 },
        { title: "Going Out Tops", products_count: 31 },
        { title: "Mini Skirts", products_count: 19 },
        { title: "Y2K Accessories", products_count: 22 },
        { title: "Frontpage", products_count: 12 }
      ],
      products: repeat(
        [
          { product_type: "Baby Tee", tags: ["y2k", "2000s", "vintage"], vendor: "Neon Rewind" },
          { product_type: "Jeans", tags: ["y2k", "low rise", "denim"], vendor: "Neon Rewind" },
          { product_type: "Top", tags: ["going out", "y2k", "club"], vendor: "Neon Rewind" },
          { product_type: "Skirt", tags: ["y2k", "denim", "mini"], vendor: "Neon Rewind" }
        ],
        136
      )
    },
    maps: {
      name: "Neon Rewind Vintage",
      address: "41 Cheshire St, London E2 6EH",
      locality: "Shoreditch",
      rating: 4.7,
      reviewCount: 312,
      types: ["used_clothing_store", "clothing_store", "store"],
      priceLevel: "PRICE_LEVEL_MODERATE",
      source: "fixture"
    }
  },
  {
    domains: ["loomandrivet.com", "loomandrivet.co.uk"],
    html: page({
      title: "Loom & Rivet: Vintage Denim & Workwear, Leeds",
      description:
        "Leeds' home of vintage Levi's 501s, Carhartt jackets, French chore coats and heavy flannels. Two shops in Leeds and a big online store.",
      keywords: "vintage denim, levi's 501, workwear, carhartt, chore coat, leeds vintage",
      siteName: "Loom & Rivet",
      image: "https://picsum.photos/seed/loom-rivet-og/1200/630",
      nav: [
        ["/product-category/levis-501", "Levi's 501"],
        ["/product-category/denim-jackets", "Denim Jackets"],
        ["/product-category/workwear-jackets", "Workwear Jackets"],
        ["/product-category/chore-coats", "Chore Coats"],
        ["/product-category/flannel-shirts", "Flannel Shirts"],
        ["/product-category/carhartt", "Carhartt"],
        ["/product-category/boots", "Boots"],
        ["/product-category/sale", "Sale"]
      ],
      platformScript: '<link rel="stylesheet" href="/wp-content/plugins/woocommerce/assets/css/woocommerce.css">',
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "ClothingStore",
            name: "Loom & Rivet Kirkgate",
            address: { "@type": "PostalAddress", streetAddress: "12 Kirkgate", addressLocality: "Leeds", postalCode: "LS2 7DJ" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: 4.8, reviewCount: 1240 }
          },
          {
            "@type": "ClothingStore",
            name: "Loom & Rivet Headingley",
            address: { "@type": "PostalAddress", streetAddress: "3 Otley Road", addressLocality: "Leeds", postalCode: "LS6 2AA" }
          }
        ]
      }
    }),
    maps: {
      name: "Loom & Rivet Vintage",
      address: "12 Kirkgate, Leeds LS2 7DJ",
      locality: "Leeds",
      rating: 4.8,
      reviewCount: 1240,
      types: ["clothing_store", "used_clothing_store", "store"],
      priceLevel: "PRICE_LEVEL_MODERATE",
      source: "fixture"
    }
  },
  {
    domains: ["gadgetgrid.co.uk"],
    html: page({
      title: "GadgetGrid | Refurbished Phones, Laptops & Tech",
      description:
        "Refurbished smartphones, laptops, headphones and chargers with a 12-month warranty. Next-day UK delivery.",
      keywords: "refurbished phones, laptops, headphones, electronics, tech deals",
      siteName: "GadgetGrid",
      image: "https://picsum.photos/seed/gadget-grid-og/1200/630",
      nav: [
        ["/collections/smartphones", "Smartphones"],
        ["/collections/laptops", "Laptops"],
        ["/collections/headphones", "Headphones"],
        ["/collections/chargers-cables", "Chargers & Cables"],
        ["/collections/tablets", "Tablets"],
        ["/collections/gaming", "Gaming"]
      ],
      platformScript: '<script>window.Shopify = {}; Shopify.theme = {"name":"Dawn"};</script>',
      jsonLd: { "@context": "https://schema.org", "@type": "ElectronicsStore", name: "GadgetGrid" }
    }),
    shopify: {
      collections: [
        { title: "Smartphones", products_count: 420 },
        { title: "Laptops", products_count: 310 },
        { title: "Headphones", products_count: 180 },
        { title: "Chargers & Cables", products_count: 95 },
        { title: "Tablets", products_count: 120 },
        { title: "Gaming", products_count: 60 }
      ],
      products: repeat(
        [
          { product_type: "Smartphone", tags: ["refurbished", "phone"], vendor: "Apple" },
          { product_type: "Laptop", tags: ["refurbished", "laptop"], vendor: "Dell" },
          { product_type: "Headphones", tags: ["audio", "headphones"], vendor: "Sony" }
        ],
        1000
      )
    },
    maps: {
      name: "GadgetGrid Repair & Store",
      address: "Unit 4, Digbeth, Birmingham B5 6DY",
      locality: "Birmingham",
      rating: 4.3,
      reviewCount: 2860,
      types: ["electronics_store", "cell_phone_store", "store"],
      source: "fixture"
    }
  }
];

/** Chips on the demo page. Live-first extract hits the network; fixtures are fallback only. */
export const DEMO_STORE_URLS = [
  "neonrewind.co.uk",
  "maxgrg.com",
  "beyondretro.com",
  "gadgetgrid.co.uk"
];

export const findFixture = (domain: string) =>
  STORE_FIXTURES.find((f) => f.domains.includes(domain.replace(/^www\./, "")));
