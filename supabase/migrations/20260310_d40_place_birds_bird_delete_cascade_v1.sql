-- D40 — Fix deleting birds linked in place_birds.
-- Problem: place_birds has a CHECK requiring exactly one of (bird_id, pending_bird_name_hu).
-- With ON DELETE SET NULL on bird_id, deleting a bird attempts to NULL bird_id, violating the CHECK.
-- Fix: make the FK ON DELETE CASCADE so the join row is deleted instead.

do $$
declare
  r record;
begin
  -- Drop any existing FK(s) on place_birds(bird_id) -> birds(id), regardless of name.
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'place_birds'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid) ilike '%FOREIGN KEY (bird_id)%REFERENCES birds%'
  loop
    execute format('alter table public.place_birds drop constraint %I', r.conname);
  end loop;

  -- Re-add as a single, canonical FK with cascade.
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'place_birds'
      and constraint_name = 'place_birds_bird_id_fkey'
  ) then
    alter table public.place_birds
      add constraint place_birds_bird_id_fkey
      foreign key (bird_id)
      references public.birds (id)
      on delete cascade;
  end if;
end $$;

