-- Versioned evidence path: legacy tags and hash vectors are never searched here.
alter table public.wholesale_documents
  add column if not exists source_url text,
  add column if not exists evidence_version integer not null default 1,
  add column if not exists evidence_fts tsvector generated always as
    (to_tsvector('english', coalesce(content, ''))) stored;
create index if not exists wholesale_evidence_fts_idx
  on public.wholesale_documents using gin (evidence_fts) where evidence_version = 2;

create or replace function public.wholesale_grounded_search(
  query_text text, match_count int default 6, rrf_k int default 60,
  vertical_filter text default null, require_vintage boolean default false
)
returns table (
  id bigint, source text, external_id text, name text, url text, source_url text,
  category text, verticals text[], categories text[], aesthetics text[], content text,
  scraped_at timestamptz, evidence_version int, rrf_score float,
  rank_fts int, rank_trgm int, rank_semantic int
)
language sql stable security invoker
set search_path = public, extensions, pg_temp
as $$
with params as (
  select websearch_to_tsquery('english', left(query_text, 4000)) as q,
    greatest(coalesce(rrf_k, 60), 1) as k,
    least(greatest(coalesce(match_count, 6), 1), 30) as lim
),
-- Fuzzy ranking uses product terms, not the repeated Boolean query string.
terms as (
  select distinct lower(m[1]) as term
  from regexp_matches(left(query_text, 4000), '"([^"]+)"', 'g') m
  where lower(m[1]) not in ('vintage', 'secondhand', 'second hand')
  union all
  select lower(trim(query_text)) where query_text !~ '"' and length(trim(query_text)) > 0
),
eligible as (
  select d.* from public.wholesale_documents d
  where d.evidence_version = 2 and d.source_url ~ '^https?://'
    and d.scraped_at is not null and length(trim(d.content)) > 80
    and length(trim(query_text)) > 0
    and (vertical_filter is null or vertical_filter = any(d.verticals))
    and (not require_vintage or d.content ~* '\m(vintage|second[- ]?hand|pre[- ]?loved|used clothing)\M')
),
ft as (
  select d.id, row_number() over(order by ts_rank_cd(d.evidence_fts, p.q) desc, d.id)::int as rank
  from eligible d cross join params p where d.evidence_fts @@ p.q
  order by rank limit 60
),
fuzzy_scores as (
  select d.id, max(extensions.word_similarity(t.term, lower(d.content))) as score
  from eligible d cross join terms t group by d.id
),
tr as (
  select id, row_number() over(order by score desc, id)::int as rank
  from fuzzy_scores where score >= 0.55 order by rank limit 60
),
fused as (
  select coalesce(ft.id, tr.id) as id, ft.rank as rank_fts, tr.rank as rank_trgm,
    coalesce(1.0 / (p.k + ft.rank), 0) + coalesce(1.0 / (p.k + tr.rank), 0) as score
  from ft full outer join tr on ft.id = tr.id cross join params p
)
select d.id, d.source, d.external_id, d.name, d.url, d.source_url, d.category,
  d.verticals, d.categories, d.aesthetics, d.content, d.scraped_at, d.evidence_version,
  f.score::float, f.rank_fts, f.rank_trgm, null::int
from fused f join eligible d on d.id = f.id
order by f.score desc, d.id limit (select lim from params);
$$;
grant execute on function public.wholesale_grounded_search(text, int, int, text, boolean) to anon, authenticated;
