# T006 – Text Review & Approval

## Goal
Admin can review and approve generated text.

## Scope
- Bird editor: Text tab
- Preview + editable fields
- Approve button sets:
  - content_blocks.review_status -> approved
  - bird.status -> text_approved

## Acceptance Criteria
- Approve persists correctly
- Image generation disabled before text_approved
