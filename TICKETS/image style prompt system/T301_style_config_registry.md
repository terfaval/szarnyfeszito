# T301 – Style Config Registry

## Goal
Centralize style presets so prompts are not edited in UI.

## Scope
- Create /server/style-config.ts exporting:
  - scientific_v1 (main_habitat / clean variants)
  - iconic_v1 (fixed pose)
- Each preset includes:
  - base prompt fragments
  - negative prompt fragments (if provider supports)
  - aspect ratios & sizes
  - background rules

## Acceptance Criteria
- Image generation uses only these presets
