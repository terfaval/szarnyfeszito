-- D17 — Image Accuracy Pipeline v1 (Science Dossier + Visual Brief gating)
-- Note: `supabase/init.sql` is kept as baseline. Apply this migration on top.

-- 1) Enums (idempotent via duplicate_object guard)
do $$
begin
  create type bird_sub_status as enum ('none', 'generated', 'approved');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type artifact_review_status as enum ('draft', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- 2) Extend images.variant enum (standing_clean remains legacy; nesting_clean is new optional)
alter type image_variant add value if not exists 'nesting_clean';

-- 3) Birds sub-status fields
alter table birds
  add column if not exists science_dossier_status bird_sub_status not null default 'none';

alter table birds
  add column if not exists visual_brief_status bird_sub_status not null default 'none';

-- 4) Artifact tables
create table if not exists bird_science_dossiers (
  id uuid primary key default gen_random_uuid(),
  bird_id uuid not null references birds (id) on delete cascade,
  schema_version text not null,
  payload jsonb not null,
  review_status artifact_review_status not null default 'draft',
  created_by text not null,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bird_science_dossiers_bird_id_idx
  on bird_science_dossiers (bird_id);

do $$
begin
  alter table bird_science_dossiers
    add constraint bird_science_dossiers_bird_id_key unique (bird_id);
exception
  when duplicate_object then null;
end $$;

create table if not exists bird_visual_briefs (
  id uuid primary key default gen_random_uuid(),
  bird_id uuid not null references birds (id) on delete cascade,
  schema_version text not null,
  payload jsonb not null,
  review_status artifact_review_status not null default 'draft',
  created_by text not null,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bird_visual_briefs_bird_id_idx
  on bird_visual_briefs (bird_id);

do $$
begin
  alter table bird_visual_briefs
    add constraint bird_visual_briefs_bird_id_key unique (bird_id);
exception
  when duplicate_object then null;
end $$;

-- 5) RLS (no policies yet; server uses service role key)
alter table bird_science_dossiers enable row level security;
alter table bird_visual_briefs enable row level security;
