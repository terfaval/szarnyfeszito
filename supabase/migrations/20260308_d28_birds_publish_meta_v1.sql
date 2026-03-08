-- D28 — Bird publish metadata (republish timestamp + revision counter)

alter table birds
  add column if not exists published_at timestamptz,
  add column if not exists published_revision integer not null default 0;

