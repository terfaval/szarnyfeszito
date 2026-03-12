-- D54 — Images: add entity_type value for habitat stock assets (D51)
-- Fix: invalid input value for enum entity_type: "habitat_stock_asset"
--
-- Notes:
-- - Some environments define `images.entity_type` as `entity_type` (enum).
-- - Others may have a differently named enum (legacy drift). We guard both.
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'entity_type'
  ) then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'entity_type'
        and e.enumlabel = 'habitat_stock_asset'
    ) then
      alter type entity_type add value 'habitat_stock_asset';
    end if;
  else
    raise notice 'Skipping enum update: public.entity_type does not exist.';
  end if;

  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'image_entity_type'
  ) then
    if not exists (
      select 1
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = 'image_entity_type'
        and e.enumlabel = 'habitat_stock_asset'
    ) then
      alter type image_entity_type add value 'habitat_stock_asset';
    end if;
  end if;
end $$;

