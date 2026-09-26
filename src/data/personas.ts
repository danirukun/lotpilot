export interface StorePersona {
  id: string;
  name: string;
  location: string;
  budget: number;
  brief: string;
  emoji: string;
}

/** Preset store personas the retailer can pick to skip typing. */
export const PERSONAS: StorePersona[] = [
  {
    id: "shoreditch-y2k",
    name: "Neon Rewind",
    location: "Shoreditch, London",
    budget: 2000,
    emoji: "\u{1F98B}",
    brief:
      "I run a Y2K thrift shop in Shoreditch. Baby tees, low-rise denim and going-out tops for 18-25s. Budget around \u00A32000."
  },
  {
    id: "bristol-cottagecore",
    name: "Meadow & Moth",
    location: "Bristol",
    budget: 1500,
    emoji: "\u{1F33F}",
    brief:
      "Cottagecore and boho boutique in Bristol. Floral tea dresses, knit cardigans and festival pieces. Roughly \u00A31500 to spend, prefer Grade A."
  },
  {
    id: "leeds-denim",
    name: "Loom & Rivet",
    location: "Leeds",
    budget: 2500,
    emoji: "\u{1F456}",
    brief:
      "Vintage denim and workwear store in Leeds. Levi's, Carhartt, chore coats. I want a strong denim wall. Budget \u00A32500."
  },
  {
    id: "london-quietlux",
    name: "Atelier Nine",
    location: "Marylebone, London",
    budget: 3000,
    emoji: "\u{1F9E5}",
    brief:
      "Quiet-luxury resale in Marylebone. Wool coats, cashmere, silk shirts in muted tones. Grade A only, budget up to \u00A33000."
  },
  {
    id: "brum-streetwear",
    name: "Framework",
    location: "Birmingham",
    budget: 1800,
    emoji: "\u{1F3C0}",
    brief:
      "Streetwear and sportswear shop near the uni in Birmingham. Vintage jerseys, band tees, sneakers and gorpcore. Around \u00A31800."
  }
];
