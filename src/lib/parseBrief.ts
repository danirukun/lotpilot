import type { Category, Grade, StoreDNA } from "@/lib/types";

export const AESTHETIC_KEYWORDS: Record<string, string[]> = {
  y2k: ["y2k", "2000s", "noughties", "mcbling", "low rise", "low-rise", "baby tee"],
  vintage: ["vintage", "retro", "true vintage", "preloved", "pre-loved"],
  streetwear: ["streetwear", "street wear", "hype", "skate", "hip hop", "hip-hop"],
  grunge: ["grunge", "90s rock", "flannel", "band tee", "alternative", "punk", "rock graphic", "band graphic"],
  workwear: ["workwear", "work wear", "carhartt", "dickies", "chore", "utility"],
  preppy: ["preppy", "prep", "ivy", "collegiate", "ralph", "polo"],
  cottagecore: ["cottagecore", "prairie", "cottage", "ditsy", "floral tea"],
  boho: ["boho", "bohemian", "festival", "hippie", "kaftan"],
  minimal: ["minimal", "quiet luxury", "quiet-luxury", "clean", "muted", "scandi"],
  sportswear: ["sportswear", "sports", "jersey", "trackie", "tracksuit", "athleisure", "gym"],
  clubwear: ["clubwear", "club", "going out", "going-out", "night out", "rave"],
  gorpcore: ["gorpcore", "techwear", "outdoor", "gore-tex", "goretex", "north face"],
  girly: ["girly", "coquette", "cute", "pink"],
  americana: ["americana", "usa", "american vintage", "college"],
  office: ["office", "workwear smart", "tailored", "business"],
  football: [
    "football", "soccer", "retro jersey", "terrace", "matchworn", "match-worn",
    "football kit", "football shirt", "home kit", "away kit", "retro kit",
    "bench coat", "drill top"
  ],
  custom: [
    "customis", "customiz", "custom denim", "custom jacket", "reworked", "upcycled",
    "hand-painted", "hand painted", "hand-printed", "iron-on", "one-off"
  ]
};

export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  denim: ["denim", "jeans", "levi", "501", "skirt", "cargo"],
  outerwear: ["jacket", "coat", "outerwear", "flannel", "shell", "puffer", "chore", "overshirt"],
  knitwear: ["knit", "jumper", "sweater", "cardigan", "cashmere", "hoodie", "hoody"],
  "tees-tops": ["tee", "t-shirt", "tshirt", "top", "shirt", "blouse", "baby tee"],
  dresses: ["dress", "dresses", "slip", "maxi", "midi", "kaftan"],
  sportswear: [
    "sportswear", "jersey", "trackie", "tracksuit", "athleisure", "sports",
    "football kit", " kits ", " kits,", "training top", "drill top", "track top"
  ],
  accessories: ["accessor", "scarf", "scarves", "belt", "bag", "sunglasses", "tie", " caps", " cap "],
  footwear: ["footwear", "shoe", "sneaker", "trainer", "boot", "docs", "doc marten"]
};

export const BRAND_DICTIONARY = [
  "Levi's", "Wrangler", "Lee", "Carhartt", "Dickies", "Nike", "adidas", "Reebok",
  "Ralph Lauren", "Tommy Hilfiger", "Nautica", "Diesel", "G-Star", "Replay",
  "Champion", "Starter", "The North Face", "Berghaus", "Salomon", "Dr. Martens",
  "Timberland", "Pringle", "John Smedley", "Laura Ashley", "Jaeger", "Aquascutum",
  "Umbro", "Ellesse", "Helly Hansen", "Kappa", "Fila", "Stussy",
  "Adidas Originals", "Admiral", "Hummel", "Le Coq Sportif", "Puma", "Diadora"
];

const GRADE_MAP: Record<string, Grade> = {
  "grade a": "A",
  "grade-a": "A",
  "a grade": "A",
  "top grade": "A",
  "grade b": "B",
  "grade ab": "AB"
};

/** Deterministically extract structured store DNA from a free-text brief. */
export function parseBrief(brief: string): StoreDNA {
  const text = ` ${brief.toLowerCase()} `;

  const aesthetics = Object.entries(AESTHETIC_KEYWORDS)
    .filter(([, kws]) => kws.some((kw) => text.includes(kw)))
    .map(([key]) => key);

  const categories = (Object.keys(CATEGORY_KEYWORDS) as Category[]).filter((cat) =>
    CATEGORY_KEYWORDS[cat].some((kw) => text.includes(kw))
  );

  const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const bareText = bare(text);
  const brands = BRAND_DICTIONARY.filter((b) => bareText.includes(bare(b)));

  const decades: string[] = [];
  for (const d of ["1970s", "1980s", "1990s", "2000s", "2010s"]) {
    const short = d.slice(2);
    if (text.includes(d) || text.includes(` ${short} `) || text.includes(`${short}s`)) {
      decades.push(d);
    }
  }
  if (aesthetics.includes("y2k") && !decades.includes("2000s")) decades.push("2000s");

  let gradeFloor: Grade | undefined;
  for (const [phrase, grade] of Object.entries(GRADE_MAP)) {
    if (text.includes(phrase)) gradeFloor = grade;
  }

  return {
    brief: brief.trim(),
    aesthetics,
    categories,
    brands,
    decades,
    budget: parseBudget(brief),
    location: parseLocation(brief),
    gradeFloor
  };
}

function parseBudget(brief: string): number | undefined {
  const candidates = [...brief.matchAll(/(?<![A-Za-z\d])([£$]?)\s?(\d[\d,]*(?:\.\d+)?)\s?(k|grand|thousand)?\b/gi)]
    .map((m) => {
      const raw = Number(m[2].replace(/,/g, ""));
      const unit = m[3]?.toLowerCase();
      const value = unit ? raw * 1000 : raw;
      return { value, hasCurrency: m[1] !== "" || Boolean(unit) };
    })
    // Skip incidental small numbers ("18-25s") and bare years ("2000s").
    .filter(
      ({ value, hasCurrency }) =>
        Number.isFinite(value) && value >= 200 && (hasCurrency || value < 1900 || value > 2030)
    );
  return (candidates.find((c) => c.hasCurrency) ?? candidates[0])?.value;
}

const KNOWN_PLACES = [
  "shoreditch", "hackney", "dalston", "peckham", "brixton", "camden", "soho",
  "marylebone", "london", "manchester", "leeds", "bristol", "birmingham",
  "glasgow", "edinburgh", "sheffield", "liverpool", "brighton", "nottingham",
  "cardiff", "newcastle", "bath", "york"
];

function parseLocation(brief: string): string | undefined {
  const lower = brief.toLowerCase();
  const hit = KNOWN_PLACES.find((p) => lower.includes(p));
  return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : undefined;
}
