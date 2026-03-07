-- D24 — Bird distribution maps v1 (GeoJSON polygon ranges)

-- 1) Table
create table if not exists bird_distribution_maps (
  id uuid primary key default gen_random_uuid(),
  bird_id uuid not null references birds (id) on delete cascade,
  schema_version text not null default 'v1',
  summary text not null,
  -- "references" collides with SQL grammar; store as a JSON array under a safe name.
  references_list jsonb not null default '[]'::jsonb,
  ranges jsonb not null default '[]'::jsonb,
  generation_meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) One record per bird
do $$
begin
  alter table bird_distribution_maps
    add constraint bird_distribution_maps_bird_id_key unique (bird_id);
exception
  when duplicate_object then null;
end $$;

create index if not exists bird_distribution_maps_bird_id_idx
  on bird_distribution_maps (bird_id);

-- 3) RLS (server uses service role key)
alter table bird_distribution_maps enable row level security;
