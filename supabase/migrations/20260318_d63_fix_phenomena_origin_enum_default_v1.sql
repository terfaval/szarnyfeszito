-- D63 -- Fix origin enum default casting

do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'phenomena' and column_name = 'origin') then
    begin
      alter table phenomena alter column origin drop default;
    exception when undefined_object then null;
    end;
  end if;
end $$;

alter table phenomena
  alter column origin type phenomenon_origin using origin::phenomenon_origin;

alter table phenomena
  alter column origin set default 'legacy_spa'::phenomenon_origin;
