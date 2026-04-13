# Dashboard Map Hover + Floating Panel Design

Date: 2026-04-13
Status: Draft (for review)
Owner: Codex

## Problem Framing
- The admin dashboard Places map hover modal feels visually heavy and inconsistent with the page style.
- Hover should be minimal to reduce distraction and avoid large overlays.
- Click should open a stable, readable panel with content and bird icons.
- Panel placement should not obscure the clicked map area.

## Scope
- Admin dashboard Places map hover tooltip and click detail panel.
- Layout, interaction rules, and panel styling updates.
- Bird list in the panel shows icon + name.

## Non-Goals
- No API schema changes.
- No changes to map data sources or publish gating.
- No new content semantics or client-side meaning generation.

## Open Questions
- None.

## Approach (Chosen)
Floating detail panel, always vertically centered, appearing on the opposite side of the click.
Hover tooltip is minimal (name + region hint only).

## Interaction + Layout
- Hover tooltip:
  - Shows place name + region hint only.
  - Does not trigger network fetch.
  - Uses cached detail data if already available; otherwise falls back to marker data.
- Click on marker or region:
  - Opens a floating panel.
  - Panel side is opposite of click side (left click -> panel on right; right click -> panel on left).
  - Panel is vertically centered and does not cover full height.
  - Panel width max 40% of viewport (min width set in CSS), max height 80-85vh.
  - Panel has sharp corners (no border radius).
- Close behavior:
  - Click outside panel closes.
  - Escape key closes.
  - Closing clears pinned selection.

## Content Order (Panel)
1. Short description.
2. Season label + seasonal snippet.
3. Top birds list (max 6).

## Bird List Presentation
- Each item is a row with icon + name.
- If `iconic_src` is present: render the icon image.
- If missing: render a fallback monogram circle (first letter).
- Optional meta line below name: `#rank · frequency_band`.
- Each row links to the bird detail route (existing link logic).

## Visual Styling
- Panel:
  - Floating card with elevated shadow, sharp corners.
  - Uses existing dashboard tokens (`--panel-2`, `--line`, `--shadow`).
  - Thin border and subtle inset highlight to match current admin UI.
- Tooltip:
  - Compact layout; smaller font and tighter padding.
  - Only name + region hint.
- Bird list:
  - Two-column row: icon on left, text on right.
  - Hover state uses subtle background tint, consistent with existing list hover states.

## Data Flow
- Hover uses marker data and cached detail (if already fetched).
- Fetch happens only for click (pinned selection).
- Existing detail API contract is used as-is.

## Error / Empty States
- If panel fetch fails: show error copy in panel body.
- If no birds: show neutral empty-state message.
- Tooltip never shows error states.

## Testing / Validation
- Hover shows only name + region hint and no network calls.
- Click opens panel on correct side based on click location.
- Panel is vertically centered and respects max width/height.
- Bird list renders icon + name and links correctly.
- Close works via backdrop and Escape.
