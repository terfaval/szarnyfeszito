-- D56 — Public read perf indexes v1
-- Minimal additive indexes to support public read paths and import upserts.

do $$
begin
  -- distribution_region_catalog_items onConflict(catalog,region_id) needs a unique index on both columns.
  if not exists (
    select 1
    from pg_indexes
    where tablename = 'distribution_region_catalog_items'
      and indexdef ilike '%unique%'
      and (
        indexdef ilike '%(catalog, region_id)%'
        or indexdef ilike '%(region_id, catalog)%'
      )
  ) then
    create unique index distribution_region_catalog_items_catalog_region_id_key
      on distribution_region_catalog_items (catalog, region_id);
  end if;

  -- birds.slug should be unique and index-backed for slug lookups.
  if not exists (
    select 1
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_attribute a on a.attrelid = t.oid and a.attnum = any (i.indkey)
    where t.relname = 'birds'
      and i.indisunique
      and array_length(i.indkey, 1) = 1
      and a.attname = 'slug'
  ) then
    create unique index birds_slug_idx on birds (slug);
  end if;
end $$;
