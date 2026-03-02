# T003 – Single Admin Authentication

## Goal
Restrict system access to one predefined admin email.

## Scope
- Supabase email login (magic link or password, pick simplest)
- Admin allowlist by email (ENV: ADMIN_EMAIL)
- Protect all /admin routes (middleware or layout guard)
- Block access to API routes for non-admin

## Acceptance Criteria
- Non-admin users blocked (UI + API)
- Admin can log in and reach dashboard
