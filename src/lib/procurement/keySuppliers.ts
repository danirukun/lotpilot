import { PERSONAS } from "@/data/personas";
import { purchaseRecord } from "@/data/purchaseHistory";
import type { SupplierScorecard } from "@/lib/procurement/types";

export const KEY_SUPPLIER_MIN_SCORE = 85;
export const KEY_SUPPLIER_BOOST = 3;

/** Active persona: an explicit known id, else an exact match of the brief against a persona brief. */
export function resolvePersonaId(brief: string, personaId?: unknown): string | undefined {
  if (typeof personaId === "string" && PERSONAS.some((p) => p.id === personaId)) return personaId;
  const clean = brief.trim();
  return PERSONAS.find((p) => p.brief.trim() === clean)?.id;
}

/** Key supplier = the persona bought from it before and it scores at least the threshold. */
export function withPurchaseHistory(card: SupplierScorecard, personaId?: string): SupplierScorecard {
  const history = purchaseRecord(personaId, card.name);
  if (!history) return card;
  return { ...card, history, keySupplier: card.score >= KEY_SUPPLIER_MIN_SCORE };
}
