-- D38 — Bird color tags v1 (Studio filters)
-- Note: `supabase/init.sql` is kept as baseline. Apply this migration on top.

do $$
begin
  create type bird_color_tag as enum (
    'white',
    'black',
    'grey',
    'brown',
    'yellow',
    'orange',
    'red',
    'green',
    'blue'
  );
exception
  when duplicate_object then null;
end $$;

alter table birds
  add column if not exists color_tags bird_color_tag[] not null default '{}'::bird_color_tag[];

create index if not exists birds_color_tags_gin_idx
  on birds
  using gin (color_tags);

