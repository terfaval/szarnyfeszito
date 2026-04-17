# Public Place Hero Title Overlay (2026-04-17)

## Problem
- On `/public/places/[slug]`, the place `title` + `subtitle` (teaser) should be rendered **on top of the cover image** (hero).
- They should be **center-center aligned** within the hero image area.
- The hero image should be **less tall** than current; cropping is acceptable (keep `object-fit: cover`).
- The `title` must be **larger**: at least as large as the largest typography used elsewhere on the place detail page.

## Scope
- Only the public place detail page rendering (the `PlacePublishPreview` `layoutVariant="public_place_v1"` path).
- Only the hero header presentation (no data contract changes).

## Non-goals
- No changes to which image variant is chosen for the hero.
- No changes to birds, map, or other sections of the page.
- No global typography refactor.

## Current State (Observed)
- `PlacePublishPreview` renders the hero image at `height: min(86vh, 760px)` and renders title/teaser in a separate header below the image.

## Options Considered
1. **Absolute overlay (recommended)**: place an overlay layer inside `.heroImageFrame`, center it with flex/grid. Add a subtle scrim for readability.
2. Header “floats” onto hero using negative margins.
3. Separate centered block under hero (not truly on-image).

## Decision
- Implement **Option 1** for `public_place_v1` when `heroImageUrl` is present:
  - Add a new overlay container inside the hero frame.
  - Vertically and horizontally center the text.
  - Use a subtle gradient/scrim behind text for legibility.
  - Reduce hero height only for `public_place_v1`.
  - Avoid duplicating title/teaser below the hero (hide/skip the header title+teaser in that variant).

## UX Details
- Title: `clamp(...)`-based font sizing, display font, tighter tracking.
- Subtitle: smaller, max-width constrained, centered, optional (only if teaser exists).
- Hero height: reduced for public pages (e.g. `min(52vh, 420px)`), still responsive.

## Acceptance Criteria
- On `/public/places/[slug]`, title + subtitle are visibly centered on the cover image.
- Hero is shorter than before; image crops as needed.
- Title is noticeably larger than prior and matches/exceeds the largest type style on the page.

