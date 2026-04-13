# Dashboard Map Panel Refinements (v2)

Date: 2026-04-13
Status: Draft (for review)
Owner: Codex

## Problem Framing
- Current floating panel is visible but not aligned with desired UI controls (only X close).
- Panel header metadata needs reordering and clearer hierarchy.
- Bird list should show iconic image + names without rank/frequency noise.
- Bird icons should include place habitat background, consistent with Places page.
- Panel needs Latin names, but payload lacks them today.

## Scope
- Floating panel UI (header, close control, bird rows).
- Map-click close behavior (background remains clickable).
- Panel data payload to include `name_latin`.
- Habitat background behind bird icons based on place habitat.

## Non-Goals
- No change to map data sources, publish gating, or place markers.
- No changes to explorer or other pages beyond shared components used here.
- No new image variants or AI generation.

## Open Questions
- None.

## Approach (Chosen)
Minimal panel refactor within existing DashboardPlacesMap component and API route. Reuse existing place habitat asset mapping.

## Interaction + Layout
- Open panel on marker/region click (existing behavior).
- Close panel via:
  - X button in top-right corner.
  - ESC key.
  - Clicking on the map background (panel closes but map remains interactive).
- Background remains clickable (no blocking modal overlay).

## Header Content
- Line 1: Place name.
- Line 2: Place type + region (county/nearest city), rendered after name.
- Actions: Only X close button, no other actions.

## Bird List Presentation
- Each row shows:
  - Iconic bird image.
  - Hungarian name.
  - Latin name (second line).
- No rank or frequency text.
- Iconic image is assumed present for published birds (no fallback required).

## Habitat Background
- Bird icon background uses place habitat asset (place-type driven), same approach as Places page.
- Iconic bird image overlays the habitat background.

## API Contract Updates
- Add `name_latin` to each bird entry returned by:
  - Admin dashboard detail API: `/api/admin/dashboard/places/[slug]`
  - Public dashboard detail API: `/api/public/dashboard/places/[slug]`

## Error / Empty States
- If birds list is empty, show existing neutral empty message.
- Tooltip remains minimal (name + region) and unchanged by this update.

## Testing / Validation
- Panel opens and closes correctly (X, ESC, map-click).
- Panel header shows name + second-line type/region.
- Bird rows show iconic image + HU/Latin names.
- Habitat background is visible behind icons.
- Public + admin dashboards both return `name_latin` and render without errors.
