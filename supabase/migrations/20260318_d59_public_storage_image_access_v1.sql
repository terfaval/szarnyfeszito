-- D59 — Public storage read policy for approved + current images
-- Keep bucket private; allow public read only for approved/current image objects.

do $$
begin
  begin
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

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'storage_objects_public_select_approved_images'
    ) then
      create policy storage_objects_public_select_approved_images
        on storage.objects
        for select
        to anon, authenticated
        using (
          bucket_id = 'bird-images'
          and exists (
            select 1
            from public.images
            where images.review_status = 'approved'
              and images.is_current = true
              and (
                images.storage_path = storage.objects.bucket_id || '/' || storage.objects.name
                or images.storage_path = storage.objects.name
              )
          )
        );
    end if;
  exception
    when insufficient_privilege then
      raise notice 'Skipping storage.objects public select policy (insufficient privileges).';
    when undefined_table then
      raise notice 'Skipping storage.* public select policy (storage schema not present).';
  end;
end $$;
