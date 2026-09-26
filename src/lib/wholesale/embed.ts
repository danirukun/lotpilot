/** Embedding dimension for wholesale_documents.embedding (OpenAI text-embedding-3-small). */
export const EMBED_DIM = 1536;

/**
 * Deterministic local embedding so hybrid RRF works offline without an API key.
 * Same model must be used at ingest and query time. Swap to OpenAI when keyed.
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

/** Prefer OpenAI embeddings when OPENAI_API_KEY is set; otherwise local hash. */
export async function embedQuery(text: string): Promise<{ embedding: number[]; model: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { embedding: hashEmbed(text), model: "local-hash-v1" };

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBED_MODEL?.trim() || "text-embedding-3-small",
        input: text.slice(0, 8000),
        dimensions: EMBED_DIM
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return { embedding: hashEmbed(text), model: "local-hash-v1" };
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    const embedding = json.data?.[0]?.embedding;
    if (!embedding || embedding.length !== EMBED_DIM) {
      return { embedding: hashEmbed(text), model: "local-hash-v1" };
    }
    return { embedding, model: "text-embedding-3-small" };
  } catch {
    return { embedding: hashEmbed(text), model: "local-hash-v1" };
  }
}
