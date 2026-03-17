-- D58 — Activity logs user_id (per-user history)
-- Adds optional user_id to support per-user progression counts.

alter table activity_logs
  add column if not exists user_id uuid;

create index if not exists activity_logs_user_id_idx
  on activity_logs (user_id);
