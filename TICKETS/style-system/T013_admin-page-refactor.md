# style-system/T013 – Admin page refactor

## Goal
Switch every admin route, shell, and helper component to the centralized helper classes so the pages no longer define their own Tailwind stacks and the look-and-feel is driven by the docs in UI_DESIGN_STOCK.md + globals.css.

## Scope
- Update the admin routes (src/app/admin/login/page.tsx, src/app/admin/(protected)/page.tsx, src/app/admin/(protected)/birds/page.tsx, src/app/admin/(protected)/birds/[birdId]/page.tsx, etc.) to use the semantic helpers (.admin-shell, .admin-card, .admin-tab, .admin-panel, .status-pill, etc.) instead of repeating the same class names directly.
- Refactor admin components that still embed lengthy Tailwind strings (BirdListShell, BirdTextReview, BirdEditorForm, etc.) so they consume the helper classes and keep their JSX minimal.
- Document in this ticket which files still require conversion per sub-task so future agents can type this ticket code and immediately know where to continue.

## Acceptance Criteria
- All admin-specific pages and components only reference helper class names defined in T011/T012 plus context-specific modifiers (e.g., className= admin-card admin-card--compact).
- No inline style prop or repeated multi-class stacks remain in the listed files after refactor.
- Manual smoke (visit /admin, /admin/birds, /admin/birds/[id]) and 
pm run lint confirm the view renders identically.

## Start
1. Open style-system/T013_admin-page-refactor.md and review the list of files below; begin with the highest-impact route (src/app/admin/(protected)/page.tsx) to confirm the new helpers work within the shell.
2. Update the page markup to use .admin-card, .admin-tab, .admin-panel, etc., and keep Card usage limited to className overrides, not repeated Tailwind classes.
3. After each file change, reload the admin route or run 
pm run lint to verify.

## File checklist
- [ ] src/app/admin/login/page.tsx
- [ ] src/app/admin/(protected)/page.tsx
- [ ] src/app/admin/(protected)/birds/page.tsx
- [ ] src/app/admin/(protected)/birds/[birdId]/page.tsx
- [ ] src/components/admin/BirdListShell.tsx
- [ ] src/components/admin/BirdTextReview.tsx
- [ ] src/components/admin/BirdImageReview.tsx
