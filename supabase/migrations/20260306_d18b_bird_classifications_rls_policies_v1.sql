-- D18b — bird_classifications RLS policies (service-role server writes)
-- Fix: Without explicit policies, INSERT/UPSERT can fail with:
--   "new row violates row-level security policy for table \"bird_classifications\""
-- even when requests originate from server routes.

alter table bird_classifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bird_classifications'
      and policyname = 'bird_classifications_service_role_all'
  ) then
    create policy bird_classifications_service_role_all
      on bird_classifications
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

