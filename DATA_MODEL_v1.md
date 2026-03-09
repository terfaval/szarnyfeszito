# Szárnyfeszítő – Data Model v1 (Admin MVP)

## 1. Core táblák

### birds

- id (uuid, pk)
- slug (unique)
- name_hu (text)
- name_latin (text)
- status (enum)
- size_category (enum, nullable) — very_small | small | medium | large
- visibility_category (enum, nullable) — frequent | seasonal | rare
- classification_status (enum) — none | generated | approved
- created_at
- updated_at

---

### content_blocks

- id (uuid)
- entity_type (bird/place/phenomenon)
- entity_id (uuid)
- short (text)
- long (text)
- feature_block (jsonb)
- blocks_json (jsonb)
- generation_meta (jsonb)
- did_you_know (text)
- ethics_tip (text)
- review_status (draft/reviewed/approved)
- version (text)

blocks_json stores the Field-Guide D1 dossier JSON (header, quick_traits, short_options, long_paragraphs, fact_box, fun_fact, ethics_tip, typical_places). generation_meta captures the model name, prompt hash, and generation timestamp for each draft.

Bird retains the full state machine—draft → text_generated → text_approved → images_generated → images_approved → published—with both text and image approvals required for publish. Place and Phenomenon content blocks remain in a text-only workflow: drafts move through text generation and review before publish, with no image variants or image gating. Field-Guide Dossier JSON (stored in `blocks_json`) is an admin/Studio artifact; Explorer (future phase) consumes UI variant records once defined, so Dossier payloads are not treated as canonical Explorer data for now.

---

### images

- id (uuid)
- entity_type
- entity_id
- style_family (scientific/iconic)
- variant (main_habitat/standing_clean/flight_clean/fixed_pose_icon_v1)
- storage_path
- review_status
- version
- created_at

---

### chef_recipes (D30)

- id (uuid)
- title (text)
- short_description (text)
- servings (int, default 2)
- cook_time_minutes (int)
- recipe_json (jsonb, strict contract v1)
- review_status (draft/reviewed/approved) — v1-ben draft/approved használat
- last_review_note (text)
- generation_meta (jsonb)
- created_at
- updated_at

Admin-only, service-role access (RLS policy service_role). A `recipe_json` a kanonikus recept payload, amit a Studio UI megjelenít és a servings skálázásához használ.

---

## 2. Enum státuszok

Bird.status:

- draft
- text_generated
- text_approved
- images_generated
- images_approved
- published

---

## 3. Publish feltétel

Bird.status → published csak akkor:

- content_blocks.review_status = approved
- main_habitat image approved
- fixed_pose_icon_v1 approved

---

Ez a minimális adatmodell az Admin MVP-hez.

# Szárnyfeszítő – Data Model v1.1

## content_blocks

Új mező:
- content_kind (enum):
  - field_guide_dossier
  - ui_variants

Explorer UI kizárólag ui_variants rekordokat használ.

---

## Places – etikai mezők

- location_precision (exact | approximate | hidden)
- sensitivity_level (normal | sensitive)
- is_beginner_friendly (bool)

Hidden location nem kerülhet publikus térképre.

---

## Places – core táblák (D31)

### places

- id (uuid, pk)
- slug (text, unique)
- name (text)
- place_type (enum) — lake | river | fishpond | reservoir | marsh | reedbed | salt_lake | forest_edge | grassland | farmland | mountain_area | urban_park | urban_waterfront | protected_area
- status (enum) — draft | reviewed | published
- region_landscape (text, nullable draft-ban)
- county (text, nullable draft-ban)
- district (text, nullable)
- nearest_city (text, nullable draft-ban)
- distance_from_nearest_city_km (int, nullable)
- settlement (text, nullable)
- location (geography point, nullable)
- location_precision (exact/approximate/hidden)
- sensitivity_level (normal/sensitive)
- is_beginner_friendly (bool)
- access_note / parking_note / best_visit_note (text, nullable)
- notable_units_json (jsonb, nullable)
- generation_input (text, nullable)
- published_at, published_revision
- created_at, updated_at

### place_birds

- id (uuid, pk)
- place_id (uuid, fk → places)
- bird_id (uuid, nullable, fk → birds)
- pending_bird_name_hu (text, nullable)
- rank (int)
- frequency_band (enum) — very_common | common | regular | occasional | special
- is_iconic (bool)
- visible_in_spring/summer/autumn/winter (bool)
- seasonality_note (text, nullable)
- created_at, updated_at

### phenomenon_places (prepared)

- phenomenon_id (uuid)
- place_id (uuid, fk → places)
- created_at
