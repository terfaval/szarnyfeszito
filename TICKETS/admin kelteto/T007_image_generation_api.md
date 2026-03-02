# T007 – Image Generation API (Controlled)

## Goal
Generate images via controlled variants (no prompt editing).

## Scope
- API route: POST /api/generate-images
- Preconditions: bird.status == text_approved
- Variants generated:
  - scientific: main_habitat, standing_clean, flight_clean
  - iconic: fixed_pose_icon_v1
- Upload to Supabase Storage
- Create images records (review_status=draft)
- Update bird.status -> images_generated

## Acceptance Criteria
- All required variants generated
- Stored paths + DB records created
