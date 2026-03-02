# T002 – Supabase Initialization

## Goal
Connect project to Supabase (Auth + DB + Storage).

## Scope
- Install @supabase/supabase-js
- Create server-side client helper
- Create initial tables (migration SQL or Supabase SQL editor script):
  - birds
  - content_blocks
  - images
- Smoke test: insert + fetch a Bird

## Acceptance Criteria
- Insert/fetch works from server
- Service role key never sent to client
