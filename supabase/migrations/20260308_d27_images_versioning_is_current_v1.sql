-- D27 — Images versioning: keep history, mark one current image per variant

-- 1) Add marker column (idempotent).
alter table images
  add column if not exists is_current boolean not null default true;

-- 2) Drop the previous single-row uniqueness constraint (introduced in D21).
alter table images
  drop constraint if exists images_entity_variant_unique;

-- 3) Backfill: mark the most recent row as current, others as history.
with ranked as (
  select
    id,
    row_number() over (
      partition by entity_type, entity_id, style_family, variant
      order by updated_at desc, created_at desc, id desc
    ) as rn
  from images
)
update images
set is_current = (ranked.rn = 1)
from ranked
where images.id = ranked.id;

-- 4) Enforce "one current per variant" via partial unique index (idempotent).
create unique index if not exists images_current_unique_idx
  on images (entity_type, entity_id, style_family, variant)
  where is_current;

