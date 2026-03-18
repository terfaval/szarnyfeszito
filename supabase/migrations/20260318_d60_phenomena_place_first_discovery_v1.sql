-- D60 -- Phenomena: place-first discovery draft v1 (MVP)
-- Adds place-first linkage, discovery drafts, and seasonal profiles.

do $$
begin
  if exists (select 1 from pg_type where typname = 'phenomenon_season') then
    begin
      alter type phenomenon_season add value if not exists 'summer';
      alter type phenomenon_season add value if not exists 'winter';
    exception when duplicate_object then null;
    end;
  end if;

  if exists (select 1 from pg_type where typname = 'phenomenon_type') then
    begin
      alter type phenomenon_type add value if not exists 'feeding_concentration';
      alter type phenomenon_type add value if not exists 'roost_movement';
      alter type phenomenon_type add value if not exists 'vocal_activity_peak';
      alter type phenomenon_type add value if not exists 'water_level_window';
      alter type phenomenon_type add value if not exists 'raptor_passage';
      alter type phenomenon_type add value if not exists 'winter_gathering';
      alter type phenomenon_type add value if not exists 'breeding_activity_window';
    exception when duplicate_object then null;
    end;
  end if;
end $$;

alter table phenomena
  alter column region_id drop not null,
  add column if not exists place_id uuid references places (id) on delete restrict,
  add column if not exists discovery_draft_id uuid,
  add column if not exists origin text default 'legacy_spa';

create index if not exists phenomena_place_id_idx on phenomena (place_id);
create index if not exists phenomena_origin_idx on phenomena (origin);

create table if not exists phenomenon_discovery_drafts (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places (id) on delete cascade,
  season phenomenon_season not null,
  phenomenon_type phenomenon_type not null,
  typical_start_mmdd text not null,
  typical_end_mmdd text not null,
  plausibility_score numeric not null,
  confidence_score numeric not null,
  why_here text not null,
  why_now text not null,
  profile_version text not null,
  scoring_version text not null,
  taxonomy_version text not null,
  source_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phenomenon_discovery_mmdd_format check (
    typical_start_mmdd ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    and typical_end_mmdd ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
  )
);

create index if not exists phenomenon_discovery_drafts_place_id_idx
  on phenomenon_discovery_drafts (place_id, season, updated_at desc);

create table if not exists place_seasonal_profiles (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places (id) on delete cascade,
  region_id text,
  season phenomenon_season not null,
  habitat_profile_json jsonb not null,
  bird_support_profile_json jsonb not null,
  candidate_phenomena_json jsonb not null,
  top_phenomenon_types_json jsonb not null,
  profile_version text not null,
  taxonomy_version text not null,
  scoring_version text not null,
  generated_at timestamptz not null default now(),
  source_hash text not null
);

create unique index if not exists place_seasonal_profiles_unique
  on place_seasonal_profiles (place_id, season, profile_version, taxonomy_version, scoring_version);

alter table phenomenon_discovery_drafts enable row level security;
alter table place_seasonal_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'phenomenon_discovery_drafts'
      and policyname = 'phenomenon_discovery_drafts_service_role_all'
  ) then
    create policy phenomenon_discovery_drafts_service_role_all
      on phenomenon_discovery_drafts
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'place_seasonal_profiles'
      and policyname = 'place_seasonal_profiles_service_role_all'
  ) then
    create policy place_seasonal_profiles_service_role_all
      on place_seasonal_profiles
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;
