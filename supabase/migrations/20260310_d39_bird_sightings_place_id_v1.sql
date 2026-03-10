-- D37 follow-up — sightings require a Place selection (Studio-only)
-- Note: keep column nullable for safe rollout; API/UI treat it as required from this point on.

alter table bird_sightings
  add column if not exists place_id uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'bird_sightings'
      and constraint_name = 'bird_sightings_place_id_fkey'
  ) then
    alter table bird_sightings
      add constraint bird_sightings_place_id_fkey
      foreign key (place_id)
      references places (id)
      on delete set null;
  end if;
end $$;

create index if not exists bird_sightings_place_id_idx
  on bird_sightings (place_id);

