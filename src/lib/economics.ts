import type { LotEconomics, WholesaleLot } from "@/lib/types";

export function computeEconomics(lot: WholesaleLot): LotEconomics {
  const expectedUnitsSold = Math.round(lot.pieceCount * lot.sellThrough);
  const projectedRevenue = expectedUnitsSold * lot.avgResale;
  const projectedProfit = projectedRevenue - lot.wholesalePrice;
  const marginPct = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;
  const roiPct = lot.wholesalePrice > 0 ? (projectedProfit / lot.wholesalePrice) * 100 : 0;
  return {
    wholesalePrice: lot.wholesalePrice,
    pricePerPiece: round2(lot.wholesalePrice / lot.pieceCount),
    projectedRevenue,
    projectedProfit,
    marginPct: round2(marginPct),
    roiPct: round2(roiPct),
    expectedUnitsSold
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
