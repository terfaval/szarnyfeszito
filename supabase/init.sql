-- Initial schema for the Szarnyfeszito Admin MVP.

-- Reset any existing schema definitions so re-running this script starts from a clean slate.
-- WARNING: dropping tables/types is destructive. Only execute in dev/test environments or after backing up production data.
drop table if exists images cascade;
drop table if exists content_blocks cascade;
drop table if exists birds cascade;
drop table if exists activity_logs cascade;
drop table if exists yoga_logs cascade;

drop type if exists image_variant cascade;
drop type if exists image_style_family cascade;
drop type if exists entity_type cascade;
drop type if exists review_status cascade;
drop type if exists bird_status cascade;
drop type if exists activity_type cascade;

create extension if not exists "pgcrypto";

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
  'fixed_pose_icon_v1'
);

create table if not exists birds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_hu text not null,
  name_latin text,
  status bird_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  review_status review_status not null default 'draft',
  version text,
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

create unique index if not exists activity_logs_date_type_idx on activity_logs (date, activity_type);

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
