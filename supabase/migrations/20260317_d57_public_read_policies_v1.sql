-- D57 — Public read policies for published content v1
-- Minimal public SELECT visibility for published/approved content.

do $$
begin
  -- Places: published only.
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'places'
      and policyname = 'places_public_select_published'
  ) then
    create policy places_public_select_published
      on places
      for select
      to anon, authenticated
      using (status = 'published');
  end if;

  -- Place birds: approved only, and only for published places.
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'place_birds'
      and policyname = 'place_birds_public_select_approved'
  ) then
    create policy place_birds_public_select_approved
      on place_birds
      for select
      to anon, authenticated
      using (
        review_status = 'approved'
        and exists (
          select 1
          from places
          where places.id = place_birds.place_id
            and places.status = 'published'
        )
      );
  end if;

  -- Images: approved + current only.
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'images'
      and policyname = 'images_public_select_approved_current'
  ) then
    create policy images_public_select_approved_current
      on images
      for select
      to anon, authenticated
      using (review_status = 'approved' and is_current = true);
  end if;
end $$;
