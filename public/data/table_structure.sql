-- EXTENSIONS
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ENUMS
do $$ begin
  create type season_enum as enum ('autumn','spring','both');
  create type likelihood_enum as enum ('common','likely','occasional','rare');
  create type count_enum as enum ('singles','dozens','hundreds','thousands');
  create type tod_enum as enum ('dawn','morning','noon','afternoon','dusk','night');
  create type obs_style_enum as enum ('tower','hide','trail','shore','boat');
  create type placement_enum as enum ('full','sidebar','caption','panel','tooltip');
  create type tone_enum as enum ('wry','playful','lyrical','matter_of_fact');
  create type voice_enum as enum ('first','second','third');
  create type media_enum as enum ('image','audio','video');
  create type status_enum as enum ('draft','published');
end $$;

-- TABLES
create table species (
  id uuid primary key default gen_random_uuid(),
  scientific_name text not null,
  common_name_hu text not null,
  "order" text,
  family text,
  iucn text,
  protected_hu boolean default false,
  protected_value_huf int,
  size_cm int,
  wingspan_cm int,
  dominant_colors text[],
  icon_priority int default 0,
  is_featured boolean default false,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on species (scientific_name);
create index on species (common_name_hu);

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  -- használj PostGIS geography pontot:
  geom geography(point, 4326),
  lat numeric, -- opcionális, ha külön is kell
  lng numeric,
  habitat_types text[],
  access_info text,
  visitor_rules text,
  difficulty text, -- simple enumot is választhatsz
  best_time_hint text,
  amenities text[],
  is_featured boolean default false,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on locations (name);
create index locations_geom_gix on locations using gist (geom);

create table location_seasons (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  season season_enum not null,
  start_month int check (start_month between 1 and 12),
  end_month int check (end_month between 1 and 12),
  peak_weeks int[],
  notes text
);
create index on location_seasons (location_id, season);

create table location_species (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  species_id uuid not null references species(id) on delete cascade,
  season season_enum not null,
  likelihood likelihood_enum,
  count_scale count_enum,
  best_time_of_day tod_enum,
  observation_style obs_style_enum,
  notes text
);
create index on location_species (location_id, season);
create index on location_species (species_id);

create table scientific_species_descriptions (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references species(id) on delete cascade,
  id_markings_md text,
  voice_md text,
  habitat_md text,
  diet_md text,
  phenology_md text,
  confusions_md text,
  sources text[]
);
create unique index on scientific_species_descriptions (species_id);

create table scientific_location_notes (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  season season_enum,
  phenology_md text,
  conservation_md text,
  management_md text,
  sources text[]
);

create table narrative_texts (
  id uuid primary key default gen_random_uuid(),
  entity_type text check (entity_type in ('species','location')) not null,
  entity_id uuid not null,
  title text,
  slug text unique,
  excerpt_md text,
  body_md text not null,
  placement placement_enum not null default 'full',
  order_index int default 0,
  tone tone_enum,
  voice_person voice_enum,
  reading_time_sec int,
  locale text default 'hu-HU',
  tags text[],
  related_media_ids uuid[],
  sources text[],
  status status_enum not null default 'draft',
  author text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_entity_species
    foreign key (entity_id)
    references species(id)
    deferrable initially deferred,
  constraint fk_entity_locations
    foreign key (entity_id)
    references locations(id)
    deferrable initially deferred
);
-- Megoldás a polimorf FK-re: a fenti két FK deferrable, és
-- alkalmazás szinten biztosítod, hogy entity_type egyezzen a cél táblával.

create table media (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  species_id uuid references species(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  type media_enum not null,
  url text not null,
  attribution text,
  license text,
  captured_at date,
  lat numeric,
  lng numeric,
  inserted_at timestamptz default now()
);

create table observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  species_id uuid not null references species(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  observed_at timestamptz not null,
  lat numeric,
  lng numeric,
  count int,
  evidence text check (evidence in ('visual','audio','photo')),
  notes text,
  inserted_at timestamptz default now()
);
create index on observations (species_id, observed_at);
create index on observations (location_id, observed_at);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  location_id uuid references locations(id) on delete set null,
  audience text,
  source_url text
);

-- RLS
alter table species enable row level security;
alter table locations enable row level security;
alter table location_seasons enable row level security;
alter table location_species enable row level security;
alter table scientific_species_descriptions enable row level security;
alter table scientific_location_notes enable row level security;
alter table narrative_texts enable row level security;
alter table media enable row level security;
alter table observations enable row level security;
alter table events enable row level security;

-- Publikus read csak a publikus tartalomra
create policy "public read species" on species
  for select using (true);

create policy "public read locations" on locations
  for select using (true);

create policy "public read location_*" on location_seasons
  for select using (true);
create policy "public read location_species" on location_species
  for select using (true);

create policy "public read sci species" on scientific_species_descriptions
  for select using (true);

create policy "public read sci location" on scientific_location_notes
  for select using (true);

create policy "public read narrative published" on narrative_texts
  for select using (status = 'published');

create policy "public read events" on events
  for select using (true);

-- Media: publikus olvasás, ha a file publikus bucketben van (app szinten kezeled)
create policy "public read media" on media
  for select using (true);

-- Observations: csak saját CRUD (későbbi közösségi réteghez)
create policy "insert own obs" on observations
  for insert with check (auth.uid() = user_id);

create policy "select own obs" on observations
  for select using (auth.uid() = user_id);

create policy "update own obs" on observations
  for update using (auth.uid() = user_id);

create policy "delete own obs" on observations
  for delete using (auth.uid() = user_id);

begin;

-- 1) Új oszlopok
alter table narrative_texts
  add column species_id uuid references species(id) on delete cascade,
  add column location_id uuid references locations(id) on delete cascade;

-- 2) Régi FK-k és oszlopok eltakarítása
alter table narrative_texts drop constraint if exists fk_entity_species;
alter table narrative_texts drop constraint if exists fk_entity_locations;
alter table narrative_texts drop column if exists entity_id;
alter table narrative_texts drop column if exists entity_type;

-- 3) CHECK: pontosan egyik legyen nem NULL
alter table narrative_texts
  add constraint narrative_exactly_one_target
  check ( (species_id is not null)::int + (location_id is not null)::int = 1 );

-- 4) Indexek
create index if not exists narrative_texts_species_idx on narrative_texts (species_id);
create index if not exists narrative_texts_location_idx on narrative_texts (location_id);
create index if not exists narrative_texts_placement_idx on narrative_texts (placement);
create index if not exists narrative_texts_status_idx on narrative_texts (status);

commit;
