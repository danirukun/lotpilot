import { BRAND_DICTIONARY } from "@/lib/parseBrief";
import type { Grade, StoreDNA } from "@/lib/types";
import type { Rfq, RfqGradeLetter } from "@/lib/rfq/types";

const UNIT = String.raw`(?:pcs?|pieces?|items?|units?|garments?)\b`;
const PER_UNIT = String.raw`(?:\s*\/\s*|\s+(?:per|a|an)\s+)(?:pc|pcs|piece|item|unit|garment)\b|\s*each\b|\s*pp\b`;
const NEGATION = /(?:\bno|\bnot|\bavoid|\bwithout|\bexclud\w*)\s+$/i;

const LETTER_GRADES: Record<RfqGradeLetter, Grade[]> = {
  A: ["A"],
  B: ["AB", "B"],
  C: ["Mixed"]
};
const LETTER_ORDER: RfqGradeLetter[] = ["A", "B", "C"];

/**
 * Map retailer grade letters to catalog grades. A → A; B → AB, B; C → Mixed.
 * A and B together → A, AB, B. "or better" adds every higher letter.
 */
export function lettersToGrades(letters: RfqGradeLetter[]): Grade[] {
  const set = new Set(letters.flatMap((l) => LETTER_GRADES[l]));
  return (["A", "AB", "B", "Mixed"] as Grade[]).filter((g) => set.has(g));
}

const round = (n: number) => Math.max(1, Math.round(n));

/** Deterministic RFQ parser. Reuses the store DNA for style, brands and budget. */
export function parseRfq(dna: StoreDNA): Rfq {
  const text = dna.brief;
  const pieceRange = parsePieces(text);
  const { letters, mode } = parseGrades(text);
  return {
    categories: dna.categories,
    aesthetics: dna.aesthetics,
    pieceRange,
    maxPricePerPiece: parsePricePerPiece(text),
    budget: parseRfqBudget(text, dna.budget, pieceRange),
    gradeLetters: letters,
    grades: lettersToGrades(letters),
    gradeMode: mode,
    brands: parseBrands(text),
    source: "deterministic"
  };
}

function parsePieces(text: string): Rfq["pieceRange"] {
  const range = [
    ...text.matchAll(
      /(?<![£$\d.,])(\d{1,4})\s*(?:-|–|—|to)\s*(\d{1,4})(?![\d%]|s\b|\s*(?:yrs?\b|years?\b|k\b|grand|quid|pounds))/gi
    )
  ].find((m) => {
    const min = Number(m[1]);
    const max = Number(m[2]);
    const before = text.slice(Math.max(0, (m.index ?? 0) - 12), m.index);
    const after = text.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 16);
    const years = min >= 1900 && max <= 2030;
    return (
      min >= 5 &&
      max > min &&
      max <= 5000 &&
      !years &&
      !/(sizes?|aged?|ages|waist|uk)\s*$/i.test(before) &&
      !/^\s*(budget|£|pounds|quid|gbp)/i.test(after)
    );
  });
  if (range) return { min: Number(range[1]), max: Number(range[2]) };

  const around = text.match(
    new RegExp(String.raw`(?:around|about|roughly|approx(?:imately)?\.?|circa|~)\s*(\d{1,4})\s*${UNIT}`, "i")
  );
  if (around) return aroundRange(Number(around[1]));

  const min =
    text.match(new RegExp(String.raw`(?:at least|min(?:imum)?(?:\s+of)?|over|more than|upwards of)\s*(\d{1,4})\s*${UNIT}`, "i")) ??
    text.match(new RegExp(String.raw`(\d{1,4})\s*\+\s*${UNIT}`, "i"));
  const max = text.match(
    new RegExp(String.raw`(?:up to|max(?:imum)?(?:\s+of)?|no more than|under|fewer than|less than|at most)\s*(\d{1,4})\s*${UNIT}`, "i")
  );
  if (min || max) {
    return { min: min ? Number(min[1]) : undefined, max: max ? Number(max[1]) : undefined };
  }

  const bare = text.match(new RegExp(String.raw`(?<![£$\d.,])(\d{1,4})\s*${UNIT}`, "i"));
  return bare ? aroundRange(Number(bare[1])) : {};
}

const aroundRange = (n: number) => ({ min: round(n * 0.8), max: round(n * 1.2) });

function parsePricePerPiece(text: string): number | undefined {
  const patterns = [
    new RegExp(String.raw`£\s?(\d{1,4}(?:\.\d{1,2})?)(?:${PER_UNIT})`, "i"),
    new RegExp(String.raw`(\d{1,4}(?:\.\d{1,2})?)\s*(?:quid|pounds|gbp)(?:${PER_UNIT})`, "i"),
    /(?:per|a|each)\s+(?:pc|piece|item|unit)\s*(?:under|below|max(?:imum)?|of|up to|at most|at)?\s*£\s?(\d{1,4}(?:\.\d{1,2})?)/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function parseRfqBudget(
  text: string,
  dnaBudget: number | undefined,
  pieces: Rfq["pieceRange"]
): number | undefined {
  const explicit = text.match(/budget\s*(?:of|is|around|about|up to|roughly|~|:)?\s*£?\s?(\d[\d,]*(?:\.\d+)?)\s*(k|grand)?\b/i);
  if (explicit) {
    const value = Number(explicit[1].replace(/,/g, "")) * (explicit[2] ? 1000 : 1);
    if (value >= 100) return value;
  }
  if (dnaBudget !== undefined && (dnaBudget === pieces.min || dnaBudget === pieces.max)) return undefined;
  return dnaBudget;
}

function parseGrades(text: string): { letters: RfqGradeLetter[]; mode: Rfq["gradeMode"] } {
  const positive = new Set<RfqGradeLetter>();
  const excluded = new Set<RfqGradeLetter>();
  let orBetter = false;

  const addList = (list: string, index: number, plus?: string) => {
    if (NEGATION.test(text.slice(Math.max(0, index - 12), index))) {
      list.toUpperCase().match(/[ABC]/g)?.forEach((l) => excluded.add(l as RfqGradeLetter));
      return;
    }
    list.toUpperCase().match(/[ABC]/g)?.forEach((l) => positive.add(l as RfqGradeLetter));
    if (plus) orBetter = true;
  };

  for (const m of text.matchAll(
    /\bgrades?\s+((?:ab|[abc])(?:\s*(?:\/|,|or|and|&)\s*(?:ab|[abc]))*)(\+|\s+or\s+(?:better|above|higher))?(?![a-z'])/gi
  )) {
    addList(m[1], m.index ?? 0, m[2]);
  }
  for (const m of text.matchAll(
    /(?<![A-Za-z])((?:AB|[ABC])(?:\s*(?:\/|,|or|and|&)\s*(?:AB|[ABC]))*)(\+)?[-\s]?[Gg]rades?\b/g
  )) {
    addList(m[1], m.index ?? 0, m[2]);
  }

  let letters = LETTER_ORDER.filter((l) => positive.has(l));
  if (orBetter && letters.length > 0) {
    const lowest = LETTER_ORDER.indexOf(letters[letters.length - 1]);
    letters = LETTER_ORDER.slice(0, lowest + 1);
  }
  if (letters.length === 0 && excluded.size > 0) letters = LETTER_ORDER;
  letters = letters.filter((l) => !excluded.has(l));
  if (letters.length === LETTER_ORDER.length) letters = [];

  const preferred = /\b(prefer(?:ably|red)?|ideally|if possible|nice to have)\b[^.]{0,24}\bgrade|\bgrade[^.]{0,12}\b(preferred|ideally|if possible)\b/i.test(
    text
  );
  return { letters, mode: preferred ? "preferred" : "required" };
}

const normalise = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ")} `;

function parseBrands(text: string): string[] {
  const hay = normalise(text);
  return BRAND_DICTIONARY.filter((b) => hay.includes(normalise(b)));
}
