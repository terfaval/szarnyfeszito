# Style System – Phase Plan

## Objective
Align the admin surface with the shared design tokens in UI_DESIGN_STOCK.md so that future tweaks only require editing a handful of helper classes rather than scattered Tailwind fragments.

## Ticket bundle
Work in three ordered tickets so each phase is traceable by code:
1. style-system/T011_style-helpers – add reusable helper classes and semantic tokens to pp/globals.css.
2. style-system/T012_component-primitives – refactor shared UI primitives (Card, Button, Input, StatusPill, shells) to consume those helpers.
3. style-system/T013_admin-page-refactor – update every admin page and the supporting admin-only components (lists, editors, login) to use the helpers and not hardcode styling.

## Quick start
- Type the ticket code (for example T011) in your tracker or IDE search; each ticket file includes a dedicated **Start** section so you can begin with that document immediately.
- Follow the ticket’s Scope/Acceptance Criteria fields before touching production components; every ticket links back to UI_DESIGN_STOCK.md for the canonical tokens and AGENTS.md for governance.
- Keep the work phase-locked: finish T011 helpers before refactoring the primitives, and do T013 last so every page consumes the new styles.

## Notes
- These tickets live under TICKETS/style-system so you can locate them via their code as soon as you type it.
- Run 
pm run lint after each ticket to make sure the new CSS classes don’t break any rules.
