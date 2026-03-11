-- D44 — Provision the Storage bucket used for generated images.
--
-- The app uploads images server-side via `SUPABASE_IMAGE_BUCKET` (default: "bird-images").
-- If the bucket does not exist, image generation fails at upload time.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'bird-images') then
    insert into storage.buckets (id, name, public)
    values ('bird-images', 'bird-images', false);
  end if;
end $$;
