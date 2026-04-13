# Dashboard Map Panel Bird List (Seasonless)

Date: 2026-04-13
Status: Draft (for review)
Owner: Codex

## Change Summary
- Panel bird list must ignore season visibility and show all approved, linked birds for the place.
- Limit remains max 6.

## Scope
- Admin + public dashboard place detail payloads.
- Dashboard floating panel bird list.

## Non-Goals
- No change to ranking or ordering logic beyond removing season filter.
- No changes to place content payloads.

## Acceptance
- Panel shows up to 6 birds linked to the place with review_status=approved.
- Season flags (visible_in_*) do not filter the list.
