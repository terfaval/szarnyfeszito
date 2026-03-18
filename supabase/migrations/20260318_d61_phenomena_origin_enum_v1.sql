-- D61 -- Phenomena: origin enum for place-first vs legacy SPA

do $$
begin
  if not exists (select 1 from pg_type where typname = 'phenomenon_origin') then
    create type phenomenon_origin as enum ('legacy_spa', 'place_discovery_v1');
  end if;
end $$;

alter table phenomena
  alter column origin type phenomenon_origin using origin::phenomenon_origin,
  alter column origin set default 'legacy_spa';
