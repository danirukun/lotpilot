import type { Category, Grade, StoreDNA } from "@/lib/types";

const AESTHETIC_KEYWORDS: Record<string, string[]> = {
  y2k: ["y2k", "2000s", "noughties", "mcbling", "low rise", "low-rise", "baby tee"],
  vintage: ["vintage", "retro", "true vintage", "preloved", "pre-loved"],
  streetwear: ["streetwear", "street wear", "hype", "skate", "hip hop", "hip-hop"],
  grunge: ["grunge", "90s rock", "flannel", "band tee", "alternative", "punk"],
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
  office: ["office", "workwear smart", "tailored", "business"]
};

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  denim: ["denim", "jeans", "levi", "501", "skirt", "cargo"],
  outerwear: ["jacket", "coat", "outerwear", "flannel", "shell", "puffer", "chore", "overshirt"],
  knitwear: ["knit", "jumper", "sweater", "cardigan", "cashmere", "hoodie", "hoody"],
  "tees-tops": ["tee", "t-shirt", "tshirt", "top", "shirt", "blouse", "baby tee"],
  dresses: ["dress", "dresses", "slip", "maxi", "midi", "kaftan"],
  sportswear: ["sportswear", "jersey", "trackie", "tracksuit", "athleisure", "sports"],
  accessories: ["accessor", "scarf", "belt", "bag", "sunglasses", "tie"],
  footwear: ["footwear", "shoe", "sneaker", "trainer", "boot", "docs", "doc marten"]
};

const BRAND_DICTIONARY = [
  "Levi's", "Wrangler", "Lee", "Carhartt", "Dickies", "Nike", "adidas", "Reebok",
  "Ralph Lauren", "Tommy Hilfiger", "Nautica", "Diesel", "G-Star", "Replay",
  "Champion", "Starter", "The North Face", "Berghaus", "Salomon", "Dr. Martens",
  "Timberland", "Pringle", "John Smedley", "Laura Ashley", "Jaeger", "Aquascutum",
  "Umbro", "Ellesse", "Helly Hansen", "Kappa", "Fila", "Stussy"
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

  const brands = BRAND_DICTIONARY.filter((b) =>
    text.includes(b.toLowerCase().replace(/[^a-z0-9 ]/g, ""))
  );

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
  const match = brief.match(/[£$]?\s?(\d[\d,]*)\s?(k|grand|thousand)?/i);
  if (!match) return undefined;
  const raw = Number(match[1].replace(/,/g, ""));
  if (Number.isNaN(raw)) return undefined;
  const unit = match[2]?.toLowerCase();
  const value = unit === "k" || unit === "grand" || unit === "thousand" ? raw * 1000 : raw;
  // Guard against picking up incidental small numbers or years.
  if (value < 200 || (value > 1900 && value < 2030 && !/[£$]/.test(match[0]))) return undefined;
  return value;
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
