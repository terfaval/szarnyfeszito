-- D52 — Habitat stock assets: RLS policies for server-side access (service_role)

alter table habitat_stock_assets enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'habitat_stock_assets'
      and policyname = 'habitat_stock_assets_service_role_all'
  ) then
    create policy habitat_stock_assets_service_role_all
      on habitat_stock_assets
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

