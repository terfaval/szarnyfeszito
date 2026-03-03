# style-system/T012 – Component primitives adopt helpers

## Goal
Have every shared UI primitive (cards, buttons, inputs, pills, shells) pull styling from the helper classes defined in T011 so the primitives render identical structure across admin pages and expose minimal Tailwind strings.

## Scope
- Update src/ui/components/Card.tsx, src/ui/components/Button.tsx, src/ui/components/Input.tsx, src/ui/components/StatusPill.tsx, src/ui/components/GateChecklist.tsx, and src/ui/components/AdminShell.tsx/AdminTopBar.tsx to use the .admin-card, .btn, .input, .status-pill, etc., helpers defined in T011.
- Keep each component’s className prop combinable with the new helpers so downstream pages can still add layout-specific tweaks.
- Remove any duplicate colors/spacing from these files and rely on tokens from globals.css (especially the ones described in UI_DESIGN_STOCK.md).
- Annotate Card and StatusPill so that future agents know which helper class maps to which bird state or shell area.

## Acceptance Criteria
- Each primitive outputs at least one helper class per card/button/pill and no longer hardcodes complex Tailwind stacks.
- AdminShell/AdminTopBar import the helper classes and still render the same DOM hierarchy, so there is no visual regression.
- The className props still forward, and tests (if available) or manual smoke via /admin view succeed.

## Start
1. Open TICKETS/style-system/T012_component-primitives.md, then inspect each component file (start with Card.tsx and Button.tsx).
2. Replace the hardcoded Tailwind string with the helper class names defined in T011 plus the existing className override.
3. Run 
pm run lint after updating each file to ensure the helpers resolve without warnings.
