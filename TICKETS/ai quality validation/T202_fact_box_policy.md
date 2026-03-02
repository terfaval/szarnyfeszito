# T202 – Fact Box & Claims Policy

## Goal
Separate 'fact' claims from narrative text and require explicit review.

## Scope
- Add fact_box field (structured JSON) to Bird content (or separate table)
- Require fact_box_review_status separate from general text approval
- UI: show fact items with checkboxes

## Acceptance Criteria
- Bird cannot reach TEXT_APPROVED unless fact_box approved
