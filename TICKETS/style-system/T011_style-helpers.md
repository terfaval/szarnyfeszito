# style-system/T011 – Global Admin Style Helpers

## Goal
Centralize every repeated color, border, spacing, and typography rule for the admin surfaces into helper classes defined in src/app/globals.css so that later visual tweaks only require editing one place.

## Scope
- Extend pp/globals.css with helper classes such as .admin-shell, .admin-card, .admin-tab, .admin-tab-active, .admin-tab-inactive, .admin-badge, .status-pill, and semantic button variants that reuse the tokens outlined in UI_DESIGN_STOCK.md.
- Reuse the existing CSS variables (--bg, --panel, --shadow, etc.) inside those helpers and document the token choices in comments so future agents know where to tune them.
- Keep the helper classes ready for both light and dark modes; rely on the existing prefers-color-scheme: dark block and the [data-time-theme= night] override.
- Mention in the doc which sections of AGENTS.md and UI_DESIGN_STOCK.md dictated each helper so every subsequent ticket can quote the same governance.

## Acceptance Criteria
- pp/globals.css exports the helper classes listed above plus any additional semantic helpers needed by the admin layout (.admin-panel, .admin-tab-wrap, .admin-card-grid, etc.).
- Each helper uses at least one shared CSS variable; no magic colors or spacing are introduced.
- Comments reference UI_DESIGN_STOCK.md tokens so the design intent stays traceable.
- Document the helper class names in this ticket file so downstream tickets can point at them when refactoring components.

## Start
1. Open this ticket (style-system/T011_style-helpers.md) and preview src/app/globals.css to list the tokens already declared.
2. Insert the helper class definitions at the bottom of globals.css, starting with general shells (e.g., .admin-shell, .admin-card) and then modifiers.
3. Save and run 
pm run lint to ensure the new CSS is valid.
