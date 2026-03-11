-- D46 — Activity logs baseline table (Studio-only)
-- Motivation: the app uses `activity_logs` via `/api/activity-logs`, but the table definition
-- was missing from repo migrations. This migration makes local/CI setups deterministic.
--
-- Notes:
-- - Intentionally does NOT enforce `(date, activity_type)` uniqueness yet.
--   The current UI/API behavior allows multiple rows per day/activity, while SPEC/D16 describe uniqueness.
--   Add/adjust constraints only after that decision is resolved.
-- - RLS is enabled and service_role gets full access (repo precedent: D37, D45, D18b).

create extension if not exists pgcrypto;

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  activity_type text not null,
  category text not null,
  exercise_id text,
  label text not null,
  duration_minutes integer,
  distance_km numeric,
  intensity integer,
  notes text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_logs_activity_type_valid
    check (activity_type in ('yoga', 'strength', 'acl', 'running'))
);

create index if not exists activity_logs_activity_type_date_idx
  on activity_logs (activity_type, date desc);

create index if not exists activity_logs_date_idx
  on activity_logs (date desc);

alter table activity_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'activity_logs'
      and policyname = 'activity_logs_service_role_all'
  ) then
    create policy activity_logs_service_role_all
      on activity_logs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

