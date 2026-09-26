/** Vector dimension of the current local-hash-v1 wholesale index. */
export const EMBED_DIM = 1536;

/**
 * Deterministic keyword vector so hybrid RRF works without an API key.
 * This is lexical hashing, not semantic embedding. Ingest and query must agree.
 */
export function hashEmbed(text: string, dim = EMBED_DIM): number[] {
  const v = new Float64Array(dim);
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
  for (const t of tokens) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
    const idx = h % dim;
    v[idx] += 1;
    v[(idx + 31) % dim] += 0.5;
    v[(idx + 97) % dim] += 0.25;
  }
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(v, (x) => Number((x / norm).toFixed(6)));
}
