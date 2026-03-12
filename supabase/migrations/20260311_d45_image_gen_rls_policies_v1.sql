-- D45 — Image generation: RLS policies for server-side writes (service_role)
-- Fix: "new row violates row-level security policy ..." during bird/place image generation.
-- Rationale: In this repo, server routes use the service key, but RLS still requires explicit policies
-- (see D18b precedent).

-- 1) public.images (generated image metadata)
alter table images enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'images_service_role_all'
  ) then
    create policy images_service_role_all
      on images
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- 2) Image-accuracy artifacts (optional prompt inputs)
alter table bird_science_dossiers enable row level security;
alter table bird_visual_briefs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bird_science_dossiers'
      and policyname = 'bird_science_dossiers_service_role_all'
  ) then
    create policy bird_science_dossiers_service_role_all
      on bird_science_dossiers
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bird_visual_briefs'
      and policyname = 'bird_visual_briefs_service_role_all'
  ) then
    create policy bird_visual_briefs_service_role_all
      on bird_visual_briefs
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end $$;

-- 3) Storage (upload/list/signed URL need access to storage.* with service_role)
-- Note: On some Supabase setups the migration role is not the owner of `storage.objects`,
-- and attempting to ALTER/CREATE POLICY will fail with:
--   ERROR: 42501: must be owner of table objects
-- In that case we skip the Storage policy changes here; bucket access should be handled
-- by running this section as the database owner (or via the Supabase dashboard).
do $$
begin
  begin
    -- Only the table owner can ALTER these tables; on some Supabase setups the SQL editor
    -- runs as a role that is not the owner of storage.objects/storage.buckets.
    -- In that case we skip storage.* changes instead of failing the whole migration.
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'storage'
        and c.relname = 'objects'
        and pg_get_userbyid(c.relowner) = current_user
    ) then
      alter table storage.objects enable row level security;
    else
      raise notice 'Skipping storage.objects RLS changes (current_user is not table owner).';
      return;
    end if;

    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'storage'
        and c.relname = 'buckets'
        and pg_get_userbyid(c.relowner) = current_user
    ) then
      alter table storage.buckets enable row level security;
    else
      raise notice 'Skipping storage.buckets RLS changes (current_user is not table owner).';
      return;
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'storage_objects_service_role_all'
    ) then
      create policy storage_objects_service_role_all
        on storage.objects
        for all
        to service_role
        using (true)
        with check (true);
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'buckets'
        and policyname = 'storage_buckets_service_role_all'
    ) then
      create policy storage_buckets_service_role_all
        on storage.buckets
        for all
        to service_role
        using (true)
        with check (true);
    end if;
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage.* RLS policies (insufficient privileges).';
    when undefined_table then
      raise notice 'Skipping storage.* RLS policies (storage schema not present).';
  end;
end $$;
