# UI/Design Stock Guide

This repo keeps a single source of design truth in `app/globals.css`, with shared shells and atoms under `src/ui`. Reusing the same tokens and component wiring from Novira helps Szarnyfeszito deliver consistent admin surfaces while keeping the data layers separate.

## Theme tokens

All tokens live in `:root` and flip automatically in `prefers-color-scheme: dark` so other agents can mirror the palette whole-cloth:

| Token | Example value | Purpose |
| --- | --- | --- |
| `--bg`, `--panel`, `--panel-2`, `--input-bg`, `--text`, `--muted` | `#fbf2df`, `rgba(47, 54, 85, 0.06)`, `#2f3655`, `rgba(47, 54, 85, 0.72)` | Backgrounds, cards, input fills, and text shades |
| `--line`, `--focus-ring`, `--shadow` | `rgba(47, 54, 85, 0.15)`, `rgba(116, 125, 255, 0.9)`, `0 20px 40px rgba(7, 12, 25, 0.35)` | Divider lines, focus glows, and drop shadows |
| `--page-bg-image`, `--page-scrim` | `url(/backgrounds/desktop_default.png)`, `linear-gradient(...)` | Layered hero/backdrop art with responsive swaps |
| `--brand-ink`, `--brand-paper`, `--brand-accent` | `#2f3655`, `#fbf2df`, `#ff7f5f` | Core ink, paper, and accent colors for badges, dots, and statuses |

Keep these tokens inside `app/globals.css` and let `prefers-color-scheme: dark` override the palettes so a single CSS file controls brand art and background scrims.

## Typography

- Display font: `Rubik` (weights 500/600/700) mapped to `--font-display`.
- Body font: `Roboto` (weights 400/600) mapped to `--font-body`; fall back to `Source Serif Pro`, "Times New Roman", Georgia.
- Headings (e.g., `.h1`, `.admin-title`) swap to `var(--font-display)` while paragraphs, lists, and inputs stick to the serif body stack.
- Utility stacks `.stack` and `.row` control spacing so cards or editors stay rhythmically aligned.

## Layout shells

- `AdminShell` (`src/ui/shell/AdminShell.tsx`) is the root wrapper for every `/admin` route; it enforces the Novira-aligned max width (~1120px via `--shell-main-max`) and side padding (`--shell-side-pad`) before layering.
- The top bar (`AdminTopBar`) keeps brand left, optional breadcrumb/section label middle, and an Icon-driven logout action on the right.
- Optional left nav mirrors Novira structure with Dashboard, Birds, Places, and Phenomena links; the content slot is a `.card` grid.
- `.admin-shell__content` ensures every page-Dashboard, Bird list, editors-respects the same layout before injecting page-specific components.

## UI primitives

- `.btn`: pill-shaped primary/secondary buttons (14px radius, panel fill, subtle border, focus glow, pointer cursor).
- `.input`: rounded text/select fields with consistent padding, background, and focus ring.
- `.card`: panels with 16px radius, soft border, drop shadow, and tokenized background for dashboards, list items, and editors.
- `.stack`, `.row`: flex helpers for vertical stacking or horizontal spreads that reuse the shared spacing scale.

## Component catalogue

1. **`Icon` (`src/ui/icons/Icon.tsx`)** - lucide-react map for named glyphs such as `generate`, `add`, `admin`, `favorite`, `back`, and the new favorites/states star mark. Always import this component instead of pulling Lucide directly.
2. **`Button` (`src/ui/components/Button.tsx`)** - renders <button className="btn">; the `variant` prop can append modifier classes if future states need differentiation.
3. **`Input` (`src/ui/components/Input.tsx`)** - renders <input className="input"> (and optionally textarea/select variants) so every form field inherits the same tokens.
4. **`Card` (`src/ui/components/Card.tsx`)** - the shared <div className="card"> shell for lists, editors, and empty states.
5. **`StatusPill` (`src/ui/components/StatusPill.tsx`)** - renders `.status-pill` plus `.is-draft`, `.is-text_generated`, etc., matching the bird state machine colors before publishing.
6. **`GateChecklist` (`src/ui/components/GateChecklist.tsx`)** - small panel that loops over { label, ok } items, shows check/faille glyphs via `Icon`, and sits inside the Publish tab.
7. **`AdminShell` / `AdminTopBar`** - combine the above primitives so Dashboard, Birds list, and editor pages immediately look cohesive without Novira-style carousels.

## Bird state machine

The shared workflow mirrors the Bird status stream in `SPEC.md`:

1. `draft`
2. `text_generated`
3. `text_approved`
4. `images_generated`
5. `images_approved`
6. `published`

`StatusPill` uses this list to toggle `.is-...` variants; `GateChecklist` asserts that `text_approved` is true, at least one `main_habitat` image is approved, and the iconic asset exists before showing the publish CTA.

## Icons & assets

- All glyphs go through `Icon.tsx`; adopt the `IconName` union when naming new icon slots so lucide usage stays centralized.
- Backgrounds and art live under `public/backgrounds/desktop_default.png` and `public/backgrounds/mobile_default.png`. The tokens `--page-bg-image` and `--page-scrim` reference those art files.
- Favorite metadata, nav badges, and checklist ticks reuse `Icon` so the same stroke weight/size is consistent.

## Interaction patterns

- Admin forms (General/Text/Images/Publish tabs) rely on `.input` fields and `.btn` controls; keep `onSubmit` and CTA states in sync with the shared tokens.
- Status pills, GateChecklist, and bird actions (Generate text, Publish) live inside `.card` shells and use `Icon` glyphs for affordance.
- `GateChecklist` panels behave like Novira style publish gate: checkboxes, `Icon` indicators, and compliance text.
- While editing, keyboard navigation drives `StatusPill` focus, and cards expose responsive `pointer-events` but respect `prefers-reduced-motion`.

## Responsive notes

- The admin shell keeps content centered via `max-width` plus horizontal padding; nav and cards reflow to stacked columns at smaller breakpoints.
- `prefers-reduced-motion` rules in `app/globals.css` turn off transitions for cards and pills.
- Utility classes like `.stack` allow vertical stacking beneath 720px without rewriting component markup.

## Build & QA

1. Run `npm run lint` after each batch to keep IDE-generated tokens clean.
2. Run `npm run build` to ensure the two-phase stock alignment completes.
3. Perform a quick manual smoke test (open `/admin`, verify Dashboard/Birds pages, confirm `StatusPill` + `GateChecklist` render).

