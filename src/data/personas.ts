export interface StorePersona {
  id: string;
  name: string;
  location: string;
  budget: number;
  /** Starter chat prompt, written as the retailer talking. */
  brief: string;
  /** Short store-DNA line for persona cards. */
  blurb: string;
  /** Store website, if the persona is a real shop. */
  url?: string;
  emoji: string;
}

/** Preset store personas the retailer can pick to skip typing. */
export const PERSONAS: StorePersona[] = [
  {
    id: "manchester-football",
    name: "Classic Football Shirts",
    location: "Hyde, Greater Manchester",
    budget: 3000,
    emoji: "\u26BD",
    url: "https://www.classicfootballshirts.co.uk/",
    blurb: "Retro football shirts, 90s kits, training tops and scarves. Umbro, adidas, Kappa.",
    brief:
      "I buy for Classic Football Shirts in Manchester. We sell retro 80s and 90s football shirts and kits from Umbro, adidas and Kappa, plus training tops, track jackets and scarves for terrace fans. Budget around \u00A33000."
  },
  {
    id: "camden-maxgrg",
    name: "MAXGRG",
    location: "Camden Market, London",
    budget: 2500,
    emoji: "\u{1F3B8}",
    url: "https://maxgrg.com/",
    blurb: "Customised vintage denim jackets with band graphics, vintage Levi's, caps and hoodies.",
    brief:
      "I run MAXGRG in the Stables at Camden Market, London. We sell customised vintage denim jackets with band and rock graphics, plus band tees, vintage Levis jeans, hoodies and caps for a streetwear crowd. 80s and 90s pieces. Budget around \u00A32500."
  },
  {
    id: "shoreditch-y2k",
    name: "Neon Rewind",
    location: "Shoreditch, London",
    budget: 2000,
    emoji: "\u{1F98B}",
    blurb: "Y2K thrift for 18-25s: baby tees, low-rise denim and going-out tops.",
    brief:
      "I run a Y2K thrift shop in Shoreditch. Baby tees, low-rise denim and going-out tops for 18-25s. Budget around \u00A32000."
  },
  {
    id: "bristol-cottagecore",
    name: "Meadow & Moth",
    location: "Bristol",
    budget: 1500,
    emoji: "\u{1F33F}",
    blurb: "Cottagecore and boho boutique: floral tea dresses, knit cardigans, festival pieces.",
    brief:
      "Cottagecore and boho boutique in Bristol. Floral tea dresses, knit cardigans and festival pieces. Roughly \u00A31500 to spend, prefer Grade A."
  },
  {
    id: "leeds-denim",
    name: "Loom & Rivet",
    location: "Leeds",
    budget: 2500,
    emoji: "\u{1F456}",
    blurb: "Vintage denim and workwear: Levi's, Carhartt and chore coats for a denim wall.",
    brief:
      "Vintage denim and workwear store in Leeds. Levi's, Carhartt, chore coats. I want a strong denim wall. Budget \u00A32500."
  },
  {
    id: "london-quietlux",
    name: "Atelier Nine",
    location: "Marylebone, London",
    budget: 3000,
    emoji: "\u{1F9E5}",
    blurb: "Quiet-luxury resale: wool coats, cashmere and silk shirts in muted tones.",
    brief:
      "Quiet-luxury resale in Marylebone. Wool coats, cashmere, silk shirts in muted tones. Grade A only, budget up to \u00A33000."
  },
  {
    id: "brum-streetwear",
    name: "Framework",
    location: "Birmingham",
    budget: 1800,
    emoji: "\u{1F3C0}",
    blurb: "Student streetwear and sportswear: vintage jerseys, band tees, sneakers, gorpcore.",
    brief:
      "Streetwear and sportswear shop near the uni in Birmingham. Vintage jerseys, band tees, sneakers and gorpcore. Around \u00A31800."
  }
];
