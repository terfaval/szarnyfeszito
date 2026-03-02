# T009 – Publish Gate Logic

## Goal
Enforce state machine and required assets before publish.

## Scope
- Publish button available only if:
  - bird.status == images_approved
  - approved: scientific.main_habitat
  - approved: iconic.fixed_pose_icon_v1
- Publish action sets bird.status -> published

## Acceptance Criteria
- Cannot publish if conditions not met
