# Bird Full Dossier v2 – Master Ticket Plan

This plan folds in the new MASTER TICKET “Bird Dossier Full Slice” structure. Each phase matches the requested vertical slice and keeps the pipeline ordered: bird creation, dossier generation, review/fix, style/image hooks, and publish gating.

## Phase 1 – Bird Creation (Single Input)
- Quick-create path that accepts only `name_latin` (optional `name_hu`), auto-generates a unique slug (lowercase, stripped diacritics, hyphenated, suffixes for collisions), and saves `status=draft`.
- Document slug algorithm and dedup rules so downstream APIs know what to expect.

## Phase 2 – Full Dossier Generation (Field-Guide D1)
- Implement `POST /api/generate-bird-dossier` (admin-only, requires `bird_id`) that:
  - Uses `AI_MODEL_TEXT` from `src/lib/config`.
  - Emits strict JSON matching the enriched D1 schema (header, quick_traits, three short options, long paragraphs, fact_box, fun_fact, ethics_tip, typical_places).
  - Validates payload (Zod or equivalent), stores `blocks_json`, `generation_meta` (model, prompt hash, timestamp), sets `review_status=draft`, and transitions bird to `text_generated`.
  - Returns validation errors with clear messages and the used model name.

## Phase 3 – Granular Review + Fix Loop
- Expand data model: add `review_state` JSON (per block/field approvals, comments, fix_requested flags, last_regenerated_at).
- Build UI controls for approving individual blocks/fields, “Request Fix” with comments, “Regenerate” per block/field, and “Approve All” (enabled only when there are no open fix requests).
- Regenerate logic targets only flagged pieces, injects fix comments into the prompt, and creates a new draft snapshot or version while keeping traceability. Bird reaches `text_approved` only when every required block and required quick_traits/fact_box field is approved.

## Phase 4 – Style Fine-Tune Hooks
- Wherever the schema calls for evocative text (`short_options`, `fun_fact`, `long_paragraphs`), insert the `/* STYLE_FINE_TUNE_HOOK: … */` marker describing the desired Douglas-Adams-like dry wit refinement brief.
- Store these hooks/refinement briefs in the database for future assistant workflows without auto-executing.

## Phase 5 – Image Brief & Style Hook
- Add `POST /api/generate-image-brief` that consumes the approved text dossier and produces structured hints for each variant (`main_habitat`, `standing_clean`, `flight_clean`, `fixed_pose_icon_v1`) with details like environment, time of day, vegetation, silhouette style, and pose description.
- Annotate the result with `/* IMAGE_STYLE_FINE_TUNE_HOOK: … */` so future assets can refine style without breaking the pipeline.

## Phase 6 – Image Generation + Review
- Use `AI_MODEL_IMAGE` and the approved image brief to generate placeholders for the four variants, storing them as before but ensuring `images_approved` only triggers when `main_habitat` and `fixed_pose_icon_v1` are approved; other variants stay optional.
- Mirror the text review workflow for image approvals/fix requests/comments.

## Phase 7 – Publish Gate
- Enforce final state transitions: publishing only allowed when `text_approved` and `images_approved`.
- Surface generation/image meta in UI and ensure publish gate logic references these statuses.

## Phase 8 – Validation & Smoke
- Add Zod schemas/tests for dossier + fix loop, and manual smoke instructions covering quick create → generate dossier → request fix → regenerate → approve → image brief + generation → publish gate.
