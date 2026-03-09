-- D35 â€” Place â†’ Bird suggestion engine: review gating for place_birds

do $$
begin
  if not exists (select 1 from pg_type where typname = 'place_bird_review_status') then
    create type place_bird_review_status as enum ('suggested', 'approved');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'place_birds'
      and column_name = 'review_status'
  ) then
    alter table place_birds
      add column review_status place_bird_review_status not null default 'approved';
  end if;
end $$;

update place_birds
set review_status = 'approved'
where review_status is null;

create index if not exists place_birds_place_id_review_status_idx
  on place_birds (place_id, review_status, rank asc, updated_at desc);
