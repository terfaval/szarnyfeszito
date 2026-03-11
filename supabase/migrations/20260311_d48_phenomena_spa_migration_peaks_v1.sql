-- D48 — Phenomena: SPA migration peaks v1 (Studio)
-- Adds Phenomenon tables to support SPA-scoped migration peak narratives + bird linking (review gated).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'phenomenon_status') then
    create type phenomenon_status as enum ('draft', 'reviewed', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'phenomenon_season') then
    create type phenomenon_season as enum ('spring', 'autumn');
  end if;

  if not exists (select 1 from pg_type where typname = 'phenomenon_type') then
    create type phenomenon_type as enum ('migration_peak');
  end if;
end $$;

create table if not exists phenomena (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  phenomenon_type phenomenon_type not null default 'migration_peak',
  season phenomenon_season not null default 'autumn',
  region_id text not null references distribution_region_catalog_items (region_id) on delete restrict,
  typical_start_mmdd text,
  typical_end_mmdd text,
  status phenomenon_status not null default 'draft',
  generation_input text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phenomena_slug_nonempty check (length(trim(slug)) > 0),
  constraint phenomena_title_nonempty check (length(trim(title)) > 0),
  constraint phenomena_mmdd_format check (
    (typical_start_mmdd is null or typical_start_mmdd ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$')
    and (typical_end_mmdd is null or typical_end_mmdd ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$')
  ),
  constraint phenomena_publish_requires_timing check (
    status <> 'published'
    or (typical_start_mmdd is not null and typical_end_mmdd is not null)
  )
);

create index if not exists phenomena_region_id_idx on phenomena (region_id);
create index if not exists phenomena_status_idx on phenomena (status);
create index if not exists phenomena_updated_at_idx on phenomena (updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_class
    where relname = 'phenomena_region_type_season_key'
  ) then
    begin
      create unique index phenomena_region_type_season_key
        on phenomena (region_id, phenomenon_type, season);
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'phenomenon_bird_review_status') then
    create type phenomenon_bird_review_status as enum ('suggested', 'approved');
  end if;
end $$;

create table if not exists phenomenon_birds (
  id uuid primary key default gen_random_uuid(),
  phenomenon_id uuid not null references phenomena (id) on delete cascade,
  bird_id uuid references birds (id) on delete set null,
  pending_bird_name_hu text,
  review_status phenomenon_bird_review_status not null default 'approved',
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phenomenon_birds_rank_nonnegative check (rank >= 0),
  constraint phenomenon_birds_pending_name_nonempty check (
    pending_bird_name_hu is null or length(trim(pending_bird_name_hu)) > 0
  ),
  constraint phenomenon_birds_exactly_one_link check (
    (bird_id is not null) <> (pending_bird_name_hu is not null)
  )
);

create index if not exists phenomenon_birds_phenomenon_id_idx on phenomenon_birds (phenomenon_id);
create index if not exists phenomenon_birds_bird_id_idx on phenomenon_birds (bird_id);
create index if not exists phenomenon_birds_rank_idx on phenomenon_birds (phenomenon_id, rank asc, updated_at desc);
create index if not exists phenomenon_birds_phenomenon_id_review_status_idx
  on phenomenon_birds (phenomenon_id, review_status, rank asc, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'phenomenon_birds_phenomenon_id_bird_id_key'
  ) then
    begin
      create unique index phenomenon_birds_phenomenon_id_bird_id_key
        on phenomenon_birds (phenomenon_id, bird_id)
        where bird_id is not null;
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class
    where relname = 'phenomenon_birds_phenomenon_id_pending_name_key'
  ) then
    begin
      create unique index phenomenon_birds_phenomenon_id_pending_name_key
        on phenomenon_birds (phenomenon_id, lower(pending_bird_name_hu))
        where pending_bird_name_hu is not null;
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'phenomenon_places_phenomenon_id_fkey'
  ) then
    begin
      alter table phenomenon_places
        add constraint phenomenon_places_phenomenon_id_fkey
        foreign key (phenomenon_id)
        references phenomena (id)
        on delete cascade;
    exception
      when duplicate_object then null;
      when duplicate_table then null;
    end;
  end if;
end $$;

alter table phenomena enable row level security;
alter table phenomenon_birds enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'phenomena'
      and policyname = 'phenomena_service_role_all'
  ) then
    create policy phenomena_service_role_all
      on phenomena
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'phenomenon_birds'
      and policyname = 'phenomenon_birds_service_role_all'
  ) then
    create policy phenomenon_birds_service_role_all
      on phenomenon_birds
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

