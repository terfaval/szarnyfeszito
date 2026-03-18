-- D62 -- Phenomena: enforce discovery snapshot for place-first records

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'phenomena_place_discovery_requires_place'
  ) then
    alter table phenomena
      add constraint phenomena_place_discovery_requires_place
      check (origin <> 'place_discovery_v1' or place_id is not null);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'phenomena_place_discovery_requires_draft'
  ) then
    alter table phenomena
      add constraint phenomena_place_discovery_requires_draft
      check (origin <> 'place_discovery_v1' or discovery_draft_id is not null);
  end if;
end $$;
