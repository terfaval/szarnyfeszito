-- D20 — Replace bird_visibility_category with Hungary-scoped buckets
-- Mapping (backfill):
--   frequent  -> common_hu
--   seasonal  -> seasonal_hu
--   rare      -> rare_hu

do $$
begin
  if exists (
    select 1
    from pg_type
    where typname = 'bird_visibility_category'
  ) then
    -- Preserve the original enum so we can safely cast existing values.
    if not exists (
      select 1
      from pg_type
      where typname = 'bird_visibility_category_old'
    ) then
      alter type bird_visibility_category rename to bird_visibility_category_old;
    end if;

    -- Create the new enum under the original canonical name.
    if not exists (
      select 1
      from pg_type
      where typname = 'bird_visibility_category'
    ) then
      create type bird_visibility_category as enum (
        'common_hu',
        'localized_hu',
        'seasonal_hu',
        'rare_hu',
        'not_in_hu'
      );
    end if;
  end if;
end $$;

-- Migrate birds.visibility_category (if the column exists).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'birds'
      and column_name = 'visibility_category'
  ) then
    -- Only attempt the type swap if the "old" enum exists (i.e., D18 already applied).
    if exists (
      select 1
      from pg_type
      where typname = 'bird_visibility_category_old'
    ) then
      alter table birds
        alter column visibility_category type bird_visibility_category
        using (
          case visibility_category::text
            when 'frequent' then 'common_hu'::bird_visibility_category
            when 'seasonal' then 'seasonal_hu'::bird_visibility_category
            when 'rare' then 'rare_hu'::bird_visibility_category
            else null
          end
        );
    end if;
  end if;
end $$;

-- Drop the old enum after the column is migrated (best-effort).
do $$
begin
  if exists (
    select 1
    from pg_type
    where typname = 'bird_visibility_category_old'
  ) then
    drop type bird_visibility_category_old;
  end if;
end $$;
