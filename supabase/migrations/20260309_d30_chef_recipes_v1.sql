-- D30 — Chef recipes (Admin-only) v1
-- Minimal, service-role only table for storing AI-generated recipes with an
-- iterative review-note + accept flow.

create table if not exists chef_recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  short_description text not null,
  servings integer not null default 2,
  cook_time_minutes integer not null,
  recipe_json jsonb not null,
  review_status review_status not null default 'draft',
  last_review_note text,
  generation_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chef_recipes_servings_positive check (servings >= 1),
  constraint chef_recipes_cook_time_positive check (cook_time_minutes >= 1)
);

create index if not exists chef_recipes_review_status_idx on chef_recipes (review_status);
create index if not exists chef_recipes_updated_at_idx on chef_recipes (updated_at desc);

alter table chef_recipes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chef_recipes'
      and policyname = 'chef_recipes_service_role_all'
  ) then
    create policy chef_recipes_service_role_all
      on chef_recipes
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

