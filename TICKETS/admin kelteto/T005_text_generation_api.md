# T005 – Text Generation API

## Goal
Server-side AI text generation for Bird content blocks.

## Scope
- API route: POST /api/generate-text
- Model from ENV: AI_MODEL_TEXT
- Input: bird_id
- Output: structured JSON mapped into content_blocks
- Save as draft/review_status=draft
- Update bird.status -> text_generated

## Acceptance Criteria
- Deterministic schema output (validated)
- Bird status updates after generation
