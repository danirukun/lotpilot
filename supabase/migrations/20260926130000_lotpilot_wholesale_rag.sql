-- LotPilot wholesale RAG: The Wholesaler UK directory index with
-- hybrid RRF search (full-text + trigram + pgvector embeddings).

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.wholesale_documents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL DEFAULT 'thewholesaler',
  external_id text,
  name text NOT NULL,
  url text NOT NULL,
  category text NOT NULL DEFAULT '',
  verticals text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  aesthetics text[] NOT NULL DEFAULT '{}',
  content text NOT NULL,
  fts tsvector,
  embedding extensions.vector(1536),
  scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wholesale_documents_url_key UNIQUE (url)
);

CREATE UNIQUE INDEX IF NOT EXISTS wholesale_documents_source_external_uidx
  ON public.wholesale_documents (source, external_id)
  WHERE external_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.wholesale_documents_fts_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  NEW.fts := to_tsvector(
    'english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.category, '') || ' ' ||
    coalesce(NEW.content, '') || ' ' ||
    coalesce(array_to_string(NEW.verticals, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.categories, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.aesthetics, ' '), '')
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wholesale_documents_fts_trg ON public.wholesale_documents;
CREATE TRIGGER wholesale_documents_fts_trg
  BEFORE INSERT OR UPDATE OF name, category, content, verticals, categories, aesthetics
  ON public.wholesale_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.wholesale_documents_fts_refresh();

CREATE INDEX IF NOT EXISTS wholesale_documents_fts_idx ON public.wholesale_documents USING gin (fts);
CREATE INDEX IF NOT EXISTS wholesale_documents_name_trgm_idx ON public.wholesale_documents USING gin (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS wholesale_documents_content_trgm_idx ON public.wholesale_documents USING gin (content extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS wholesale_documents_embedding_hnsw_idx ON public.wholesale_documents
  USING hnsw (embedding extensions.vector_cosine_ops)
  WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS wholesale_documents_verticals_idx ON public.wholesale_documents USING gin (verticals);
CREATE INDEX IF NOT EXISTS wholesale_documents_categories_idx ON public.wholesale_documents USING gin (categories);

ALTER TABLE public.wholesale_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read wholesale directory" ON public.wholesale_documents;
CREATE POLICY "Public read wholesale directory"
  ON public.wholesale_documents
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.wholesale_hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536) DEFAULT NULL,
  match_count int DEFAULT 8,
  full_text_weight float DEFAULT 1,
  trigram_weight float DEFAULT 1,
  semantic_weight float DEFAULT 1,
  rrf_k int DEFAULT 60
)
RETURNS TABLE (
  id bigint,
  source text,
  external_id text,
  name text,
  url text,
  category text,
  verticals text[],
  categories text[],
  aesthetics text[],
  content text,
  scraped_at timestamptz,
  rrf_score float,
  rank_fts int,
  rank_trgm int,
  rank_semantic int
)
LANGUAGE sql
STABLE
SET search_path = public, extensions, pg_temp
AS $$
WITH
params AS (
  SELECT
    least(greatest(coalesce(match_count, 8), 1), 30) AS lim,
    greatest(coalesce(rrf_k, 60), 1) AS k
),
full_text AS (
  SELECT
    d.id,
    row_number() OVER (
      ORDER BY ts_rank_cd(d.fts, websearch_to_tsquery('english', query_text)) DESC
    )::int AS rank_ix
  FROM public.wholesale_documents d
  WHERE query_text IS NOT NULL
    AND length(trim(query_text)) > 0
    AND d.fts IS NOT NULL
    AND d.fts @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank_ix
  LIMIT (SELECT lim * 2 FROM params)
),
trigram AS (
  SELECT
    d.id,
    row_number() OVER (
      ORDER BY greatest(
        extensions.similarity(d.name, query_text),
        extensions.similarity(left(d.content, 2000), query_text)
      ) DESC
    )::int AS rank_ix
  FROM public.wholesale_documents d
  WHERE query_text IS NOT NULL
    AND length(trim(query_text)) > 0
    AND (
      d.name % query_text
      OR left(d.content, 2000) % query_text
      OR extensions.similarity(d.name, query_text) > 0.12
      OR extensions.similarity(left(d.content, 2000), query_text) > 0.08
    )
  ORDER BY rank_ix
  LIMIT (SELECT lim * 2 FROM params)
),
semantic AS (
  SELECT
    d.id,
    row_number() OVER (
      ORDER BY d.embedding <=> query_embedding
    )::int AS rank_ix
  FROM public.wholesale_documents d
  WHERE query_embedding IS NOT NULL
    AND d.embedding IS NOT NULL
  ORDER BY rank_ix
  LIMIT (SELECT lim * 2 FROM params)
),
fused AS (
  SELECT
    coalesce(ft.id, tr.id, se.id) AS id,
    coalesce(1.0 / ((SELECT k FROM params) + ft.rank_ix), 0.0) * coalesce(full_text_weight, 1) +
    coalesce(1.0 / ((SELECT k FROM params) + tr.rank_ix), 0.0) * coalesce(trigram_weight, 1) +
    coalesce(1.0 / ((SELECT k FROM params) + se.rank_ix), 0.0) * coalesce(semantic_weight, 1) AS score,
    ft.rank_ix AS rank_fts,
    tr.rank_ix AS rank_trgm,
    se.rank_ix AS rank_semantic
  FROM full_text ft
  FULL OUTER JOIN trigram tr ON ft.id = tr.id
  FULL OUTER JOIN semantic se ON coalesce(ft.id, tr.id) = se.id
)
SELECT
  d.id,
  d.source,
  d.external_id,
  d.name,
  d.url,
  d.category,
  d.verticals,
  d.categories,
  d.aesthetics,
  d.content,
  d.scraped_at,
  f.score::float AS rrf_score,
  f.rank_fts,
  f.rank_trgm,
  f.rank_semantic
FROM fused f
JOIN public.wholesale_documents d ON d.id = f.id
ORDER BY f.score DESC, d.name ASC
LIMIT (SELECT lim FROM params);
$$;

GRANT SELECT ON public.wholesale_documents TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wholesale_hybrid_search(text, extensions.vector, int, float, float, float, int) TO anon, authenticated;
