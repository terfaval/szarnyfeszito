-- D60 — Public read policy for published birds v1
-- Allow anon/authenticated SELECT on published birds so public place detail joins work under RLS.

do $$
begin
  -- Ensure RLS is enabled (idempotent).
  alter table public.birds enable row level security;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'birds'
      and policyname = 'birds_public_select_published'
  ) then
    create policy birds_public_select_published
      on public.birds
      for select
      to anon, authenticated
      using (status = 'published');
  end if;
end $$;

