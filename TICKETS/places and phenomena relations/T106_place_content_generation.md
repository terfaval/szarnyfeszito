# T106 – Place Text Generation (AI)

## Goal
Generate structured text blocks for Place.

## Scope
- POST /api/generate-text?entity=place (or separate route)
- Variants:
  - teaser/short (as available)
  - seasonal_snippet (optional)
  - ethics_tip
- Save to content_blocks with entity_type=place

## Acceptance Criteria
- Place content_blocks created and reviewable
