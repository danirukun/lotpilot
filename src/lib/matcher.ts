import { LOTS } from "@/data/lots";
import { computeEconomics } from "@/lib/economics";
import type { Grade, LotScore, StoreDNA, WholesaleLot } from "@/lib/types";

const GRADE_RANK: Record<Grade, number> = { A: 3, AB: 2, B: 1, Mixed: 1 };

const AESTHETIC_LABEL: Record<string, string> = {
  y2k: "Y2K",
  vintage: "vintage",
  streetwear: "streetwear",
  grunge: "grunge",
  workwear: "workwear",
  preppy: "preppy",
  cottagecore: "cottagecore",
  boho: "boho / festival",
  minimal: "minimal / quiet-luxury",
  sportswear: "sportswear",
  clubwear: "clubwear",
  gorpcore: "gorpcore",
  girly: "girly",
  americana: "americana",
  office: "smart / office",
  athleisure: "athleisure",
  festival: "festival",
  surf: "surf",
  football: "football / retro kits",
  custom: "customised / reworked"
};

/** Rank a catalog slice against parsed store DNA. Fully deterministic. */
export function rankLots(dna: StoreDNA, catalogLots: WholesaleLot[] = LOTS, limit = 6): LotScore[] {
  const scored = catalogLots.map((lot) =>
    (lot.catalog ?? "fashion") === "electronics" ? scoreElectronicsLot(lot, dna) : scoreLot(lot, dna)
  );
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function scoreElectronicsLot(lot: WholesaleLot, dna: StoreDNA): LotScore {
  const economics = computeEconomics(lot);
  const reasons: string[] = [];

  const categoryHit = dna.categories.includes(lot.category);
  let categoryPoints = categoryHit ? 45 : dna.categories.length === 0 ? 25 : 8;
  if (categoryHit) reasons.push(`Matches your ${lot.category.replace("-", " ")} focus`);

  const matchedBrands = lot.brands.filter((b) => dna.brands.includes(b));
  const brandPoints = Math.min(25, matchedBrands.length * 10);
  if (matchedBrands.length > 0) reasons.push(`Includes ${matchedBrands.join(", ")}`);

  const titleTokens = lot.title.toLowerCase();
  const corpusHit = dna.brief.toLowerCase().split(/\W+/).some((w) => w.length > 3 && titleTokens.includes(w));
  const keywordPoints = corpusHit ? 10 : 5;

  const marginScore = clamp(Math.round((economics.roiPct / 150) * 15), 0, 15);
  if (economics.roiPct >= 80) reasons.push(`Projected ${Math.round(economics.roiPct)}% ROI`);

  let gradePenalty = 0;
  if (dna.gradeFloor && GRADE_RANK[lot.grade] < GRADE_RANK[dna.gradeFloor]) {
    gradePenalty = 15;
    reasons.push(`Grade ${lot.grade} is below your ${dna.gradeFloor} floor`);
  }

  const budgetFit = dna.budget ? lot.wholesalePrice <= dna.budget : true;
  let budgetPenalty = 0;
  if (dna.budget && !budgetFit) {
    budgetPenalty = 12;
    reasons.push(`Over budget by £${lot.wholesalePrice - dna.budget}`);
  } else if (dna.budget) {
    reasons.push(`£${lot.wholesalePrice} fits your budget`);
  }

  const fitScore = clamp(categoryPoints + brandPoints + keywordPoints, 0, 85);
  const score = clamp(Math.round(fitScore + marginScore - gradePenalty - budgetPenalty), 0, 100);

  return {
    lot,
    score,
    fitScore: Math.round((fitScore / 85) * 100),
    marginScore: Math.round((marginScore / 15) * 100),
    budgetFit,
    reasons: reasons.slice(0, 4),
    economics
  };
}

function scoreLot(lot: WholesaleLot, dna: StoreDNA): LotScore {
  const economics = computeEconomics(lot);
  const reasons: string[] = [];

  // --- Fit: aesthetics (max 50) ---
  const matchedAesthetics = lot.aesthetics.filter((a) => dna.aesthetics.includes(a));
  let aestheticPoints = Math.min(50, matchedAesthetics.length * 20);
  // Reward lots whose primary (first-listed) aesthetic is what the store wants.
  if (matchedAesthetics.length > 0 && dna.aesthetics.includes(lot.aesthetics[0])) {
    aestheticPoints = Math.min(50, aestheticPoints + 8);
  }
  if (dna.aesthetics.length === 0) aestheticPoints = 20; // neutral when no signal
  if (matchedAesthetics.length > 0) {
    reasons.push(
      `Matches your ${matchedAesthetics.map((a) => AESTHETIC_LABEL[a] ?? a).join(" + ")} lean`
    );
  }

  // --- Fit: category (max 20) ---
  const categoryHit = dna.categories.includes(lot.category);
  const categoryPoints = categoryHit ? 20 : dna.categories.length === 0 ? 10 : 0;
  if (categoryHit) reasons.push(`Fills your ${lot.category.replace("-", " / ")} rail`);

  // --- Fit: brands (max 10) ---
  const matchedBrands = lot.brands.filter((b) => dna.brands.includes(b));
  const brandPoints = Math.min(10, matchedBrands.length * 6);
  if (matchedBrands.length > 0) reasons.push(`Includes ${matchedBrands.join(", ")}`);

  // --- Fit: decade (max 10) ---
  const decadeHit = lot.decades.some((d) => dna.decades.includes(d));
  const decadePoints = decadeHit ? 10 : dna.decades.length === 0 ? 5 : 0;
  if (decadeHit) reasons.push(`Right era (${lot.decades.join(", ")})`);

  const fitScore = clamp(aestheticPoints + categoryPoints + brandPoints + decadePoints, 0, 90);

  // --- Margin (max 15, scaled from ROI) ---
  const marginScore = clamp(Math.round((economics.roiPct / 200) * 15), 0, 15);
  if (economics.roiPct >= 120) {
    reasons.push(`Strong ${Math.round(economics.roiPct)}% projected ROI`);
  } else if (economics.roiPct >= 80) {
    reasons.push(`Healthy ${Math.round(economics.roiPct)}% projected ROI`);
  }

  // --- Grade gate ---
  let gradePenalty = 0;
  if (dna.gradeFloor) {
    const floor = GRADE_RANK[dna.gradeFloor];
    if (GRADE_RANK[lot.grade] < floor) {
      gradePenalty = 18;
      reasons.push(`Note: Grade ${lot.grade} is below your Grade ${dna.gradeFloor} floor`);
    } else {
      reasons.push(`Meets your Grade ${dna.gradeFloor}+ requirement`);
    }
  }

  // --- Budget fit ---
  const budgetFit = dna.budget ? lot.wholesalePrice <= dna.budget : true;
  let budgetPenalty = 0;
  if (dna.budget) {
    if (budgetFit) {
      const share = Math.round((lot.wholesalePrice / dna.budget) * 100);
      reasons.push(`\u00A3${lot.wholesalePrice} fits your budget (${share}% of it)`);
    } else {
      budgetPenalty = 12;
      reasons.push(`Over budget by \u00A3${lot.wholesalePrice - dna.budget}`);
    }
  }

  const score = clamp(
    Math.round(fitScore + marginScore - gradePenalty - budgetPenalty),
    0,
    100
  );

  return {
    lot,
    score,
    fitScore: Math.round((fitScore / 90) * 100),
    marginScore: Math.round((marginScore / 15) * 100),
    budgetFit,
    reasons: reasons.slice(0, 4),
    economics
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
