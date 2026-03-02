# T201 – AI Output Schema Validation

## Goal
Enforce strict schema validation for all AI outputs before saving.

## Scope
- Zod schemas for:
  - Bird content blocks
  - Place content blocks
  - Phenomenon content blocks
- Validate char limits per variant
- Reject + return clear error if invalid
- Store validation report in DB (optional column: validation_report jsonb)

## Acceptance Criteria
- Invalid AI output never persists as approved content
- Errors are visible in admin UI
