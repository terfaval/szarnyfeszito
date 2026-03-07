-- D21 — Ensure one current image per (entity_type, entity_id, variant)
-- Rationale:
-- - Image generation uses UPSERT (see SPEC T007 "upsert images rows")
-- - Regeneration should replace the current row instead of creating duplicates

-- 1) Deterministically de-duplicate any existing rows (keep most recently updated).
with ranked as (
  select
    id,
    row_number() over (
      partition by entity_type, entity_id, variant
      order by updated_at desc, created_at desc, id desc
    ) as rn
  from images
)
delete from images
where id in (select id from ranked where rn > 1);

-- 2) Add uniqueness constraint for conflict targets (idempotent).
do $$
begin
  alter table images
    add constraint images_entity_variant_unique
    unique (entity_type, entity_id, variant);
exception
  when duplicate_object then null;
end $$;

