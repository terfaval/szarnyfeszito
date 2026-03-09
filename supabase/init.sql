-- Initial schema for the Szarnyfeszito Admin MVP.

-- Reset any existing schema definitions so re-running this script starts from a clean slate.
-- WARNING: dropping tables/types is destructive. Only execute in dev/test environments or after backing up production data.
drop table if exists images cascade;
drop table if exists content_blocks cascade;
drop table if exists birds cascade;
drop table if exists phenomenon_places cascade;
drop table if exists place_birds cascade;
drop table if exists places cascade;
drop table if exists activity_logs cascade;
drop table if exists yoga_logs cascade;

drop type if exists image_variant cascade;
drop type if exists image_style_family cascade;
drop type if exists entity_type cascade;
drop type if exists review_status cascade;
drop type if exists bird_status cascade;
drop type if exists place_status cascade;
drop type if exists place_type cascade;
drop type if exists place_location_precision cascade;
drop type if exists place_sensitivity_level cascade;
drop type if exists place_frequency_band cascade;
drop type if exists activity_type cascade;

create extension if not exists "pgcrypto";
create extension if not exists postgis;

create type bird_status as enum (
  'draft',
  'text_generated',
  'text_approved',
  'images_generated',
  'images_approved',
  'published'
);

create type review_status as enum ('draft', 'reviewed', 'approved');

create type entity_type as enum ('bird', 'place', 'phenomenon');

create type image_style_family as enum ('scientific', 'iconic');

 create type image_variant as enum (
   'main_habitat',
   'standing_clean',
   'flight_clean',
   'nesting_clean',
   'fixed_pose_icon_v1'
 );

 create table if not exists birds (
   id uuid primary key default gen_random_uuid(),
   slug text not null unique,
   name_hu text not null,
   name_latin text,
   status bird_status not null default 'draft',
   published_at timestamptz,
   published_revision integer not null default 0,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );

create type place_status as enum ('draft', 'reviewed', 'published');

create type place_type as enum (
  'lake',
  'river',
  'fishpond',
  'reservoir',
  'marsh',
  'reedbed',
  'salt_lake',
  'forest_edge',
  'grassland',
  'farmland',
  'mountain_area',
  'urban_park',
  'urban_waterfront',
  'protected_area'
);

create type place_location_precision as enum ('exact', 'approximate', 'hidden');
create type place_sensitivity_level as enum ('normal', 'sensitive');
create type place_frequency_band as enum ('very_common', 'common', 'regular', 'occasional', 'special');

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  place_type place_type not null,
  status place_status not null default 'draft',
  region_landscape text,
  county text,
  district text,
  nearest_city text,
  distance_from_nearest_city_km integer,
  settlement text,
  location geography(point, 4326),
  location_precision place_location_precision not null default 'approximate',
  sensitivity_level place_sensitivity_level not null default 'normal',
  is_beginner_friendly boolean not null default false,
  access_note text,
  parking_note text,
  best_visit_note text,
  notable_units_json jsonb,
  generation_input text,
  published_at timestamptz,
  published_revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint places_distance_positive check (distance_from_nearest_city_km is null or distance_from_nearest_city_km >= 0),
  constraint places_slug_nonempty check (length(trim(slug)) > 0),
  constraint places_name_nonempty check (length(trim(name)) > 0),
  constraint places_publish_requires_core_fields check (
    status <> 'published'
    or (
      region_landscape is not null
      and county is not null
      and nearest_city is not null
      and length(trim(region_landscape)) > 0
      and length(trim(county)) > 0
      and length(trim(nearest_city)) > 0
    )
  ),
  constraint places_hidden_location_not_mappable check (
    location_precision <> 'hidden' or location is null
  )
);

create index if not exists places_status_idx on places (status);
create index if not exists places_place_type_idx on places (place_type);
create index if not exists places_updated_at_idx on places (updated_at desc);

create table if not exists place_birds (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places (id) on delete cascade,
  bird_id uuid references birds (id) on delete set null,
  pending_bird_name_hu text,
  rank integer not null default 0,
  frequency_band place_frequency_band not null default 'regular',
  is_iconic boolean not null default false,
  visible_in_spring boolean not null default false,
  visible_in_summer boolean not null default false,
  visible_in_autumn boolean not null default false,
  visible_in_winter boolean not null default false,
  seasonality_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint place_birds_rank_nonnegative check (rank >= 0),
  constraint place_birds_pending_name_nonempty check (pending_bird_name_hu is null or length(trim(pending_bird_name_hu)) > 0),
  constraint place_birds_exactly_one_link check (
    (bird_id is not null) <> (pending_bird_name_hu is not null)
  )
);

create index if not exists place_birds_place_id_idx on place_birds (place_id);
create index if not exists place_birds_bird_id_idx on place_birds (bird_id);
create index if not exists place_birds_rank_idx on place_birds (place_id, rank asc, updated_at desc);

create unique index if not exists place_birds_place_id_bird_id_key
  on place_birds (place_id, bird_id)
  where bird_id is not null;

create unique index if not exists place_birds_place_id_pending_name_key
  on place_birds (place_id, lower(pending_bird_name_hu))
  where pending_bird_name_hu is not null;

create table if not exists phenomenon_places (
  phenomenon_id uuid not null,
  place_id uuid not null references places (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (phenomenon_id, place_id)
);

create index if not exists phenomenon_places_place_id_idx on phenomenon_places (place_id);

create or replace view place_markers_v1 as
select
  id,
  slug,
  name,
  place_type,
  status,
  location_precision,
  sensitivity_level,
  is_beginner_friendly,
  case when location is null then null else st_y(location::geometry) end as lat,
  case when location is null then null else st_x(location::geometry) end as lng,
  updated_at
from places;

create table if not exists content_blocks (
  id uuid primary key default gen_random_uuid(),
  entity_type entity_type not null,
  entity_id uuid not null,
  short text,
  long text,
  feature_block jsonb,
  blocks_json jsonb,
  generation_meta jsonb,
  did_you_know text,
  ethics_tip text,
  review_status review_status not null default 'draft',
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

 create table if not exists images (
   id uuid primary key default gen_random_uuid(),
   entity_type entity_type not null,
   entity_id uuid not null,
   style_family image_style_family not null,
   variant image_variant not null,
   storage_path text not null,
   is_current boolean not null default true,
   review_status review_status not null default 'draft',
   version text,
   style_config_id text,
   seed integer,
   width_px integer,
   height_px integer,
   provider_model text,
   spec_hash text,
   prompt_hash text,
   created_by text not null default 'script',
   review_comment text,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
 );

create type activity_type as enum ('yoga', 'strength', 'acl', 'running');

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  activity_type activity_type not null,
  category text not null,
  exercise_id text,
  label text not null,
  duration_minutes integer,
  distance_km numeric(6,2),
  intensity smallint,
  notes text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allow multiple logs per day+type (e.g. multiple yoga entries on the same day).
create index if not exists activity_logs_date_type_idx on activity_logs (date, activity_type);

create table if not exists yoga_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  exercise_id text not null,
  exercise_label text not null,
  exercise_type text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
