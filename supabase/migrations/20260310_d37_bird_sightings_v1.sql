-- D37 — Birdwatch sightings log v1 (Studio-only)
-- Note: `supabase/init.sql` is kept as baseline. Apply this migration on top.

create table if not exists bird_sightings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  seen_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bird_sightings_created_by_seen_at_idx
  on bird_sightings (created_by, seen_at desc);

create table if not exists bird_sighting_birds (
  sighting_id uuid not null references bird_sightings (id) on delete cascade,
  bird_id uuid not null references birds (id) on delete restrict,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  constraint bird_sighting_birds_quantity_positive check (quantity > 0),
  primary key (sighting_id, bird_id)
);

create index if not exists bird_sighting_birds_bird_id_idx
  on bird_sighting_birds (bird_id);

alter table bird_sightings enable row level security;
alter table bird_sighting_birds enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bird_sightings'
      and policyname = 'bird_sightings_service_role_all'
  ) then
    create policy bird_sightings_service_role_all
      on bird_sightings
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bird_sighting_birds'
      and policyname = 'bird_sighting_birds_service_role_all'
  ) then
    create policy bird_sighting_birds_service_role_all
      on bird_sighting_birds
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

