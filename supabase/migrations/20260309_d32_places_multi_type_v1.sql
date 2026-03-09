-- D32 — Places: optional multi-type support (primary + additional types)

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'places'
      and column_name = 'place_types'
  ) then
    alter table places
      add column place_types place_type[] not null default '{}'::place_type[];
  end if;
end $$;

update places
set place_types = array[place_type]
where place_types is null
   or array_length(place_types, 1) is null
   or array_length(place_types, 1) = 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'places_place_type_in_place_types'
  ) then
    begin
      alter table places
        add constraint places_place_type_in_place_types
        check (array_position(place_types, place_type) is not null);
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

create index if not exists places_place_types_gin_idx on places using gin (place_types);

