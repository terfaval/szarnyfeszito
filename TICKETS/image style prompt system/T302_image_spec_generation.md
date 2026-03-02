# T302 – Image Spec Generator

## Goal
Generate image-spec objects deterministically from (bird + variant).

## Scope
- Function: buildImageSpec({bird, variant})
- Fields:
  - style_family
  - variant
  - aspect_ratio
  - background_rule
  - prompt_payload (structured)
- Persist image_specs table (optional) OR reuse images table draft rows

## Acceptance Criteria
- Same inputs -> same spec (except seeds)
