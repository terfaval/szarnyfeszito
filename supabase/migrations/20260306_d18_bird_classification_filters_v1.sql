-- D18 — Bird size + visibility classification (Studio filters + AI suggestion queue)
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

do $$
begin
  create type bird_size_category as enum ('very_small', 'small', 'medium', 'large');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type bird_visibility_category as enum ('frequent', 'seasonal', 'rare');
exception
  when duplicate_object then null;
end $$;

-- 2) Birds classification fields
alter table birds
  add column if not exists size_category bird_size_category;

alter table birds
  add column if not exists visibility_category bird_visibility_category;

alter table birds
  add column if not exists classification_status bird_sub_status not null default 'none';

-- 3) Classification artifact table (auditable suggestions + approvals)
create table if not exists bird_classifications (
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

create index if not exists bird_classifications_bird_id_idx
  on bird_classifications (bird_id);

do $$
begin
  alter table bird_classifications
    add constraint bird_classifications_bird_id_key unique (bird_id);
exception
  when duplicate_object then null;
end $$;

-- 4) RLS (no policies yet; server uses service role key)
alter table bird_classifications enable row level security;

