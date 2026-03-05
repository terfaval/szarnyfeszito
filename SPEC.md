# Szárnyfeszítő – Keltető (Admin) MVP SPEC v0

## 1. Cél

Az MVP célja egy belső Admin/Keltető rendszer létrehozása, amely:

- Madár (Bird), Helyszín (Place) és Jelenség (Phenomenon) entitásokat kezel
- AI segítségével strukturált szövegeket generál
- Jóváhagyási folyamaton keresztül képeket generál
- Verziózott, review-alapú publikálási folyamatot biztosít
- Nem publikus felület

Ez a rendszer a Szárnyfeszítő tartalomgyártási motorja.

---

## 2. Scope Lock

### IN (MVP-ben benne van)

- Single-admin belépés
- Bird / Place / Phenomenon CRUD-lite
- Szöveg generálás (AI → JSON → draft)
- Szöveg review + approve
- Kép generálás (szabályozott flow)
- Kép review + approve
- Publish gate (állapotvezérelt)
- Verziózás (alap szinten)
- Dokumentált pipeline

### OUT (MVP-ben NINCS)

- Publikus UI
- Térkép
- Journaling
- Közösségi funkciók
- Multi-role rendszer
- Külső adatforrás integráció
- Helyszín hangulatképek
- Promptolható képgenerálás

Explorer skeleton is a future phase. Explorer visuals, routing, and content rendering are not in active development for this MVP; the current workstream remains focused on the Studio generative engine, with Bird as the primary artifact being authored, reviewed, and published.
Current active scope: Studio generative engine for Bird content, encompassing AI dossier generation, text review, image review, and Bird-specific publish gating. Place and Phenomenon workstreams remain limited to planning until their data contracts and Explorer rendering are formally scoped.

---

## 3. Entitások

### 3.1 Bird

Core mezők:
- id
- slug
- name_hu
- name_latin
- status (draft | text_approved | images_approved | published)
- created_at
- updated_at

Kapcsolódó:
- content_blocks
- images

---

### 3.2 Place

Core mezők:
- id
- slug
- name
- region
- place_type
- status

---

### 3.3 Phenomenon

Core mezők:
- id
- slug
- title
- phenomenon_type
- status

---

## 4. Content Pipeline (State Machine)

Bird státuszfolyam:

DRAFT  
→ TEXT_GENERATED  
→ TEXT_APPROVED  
→ IMAGES_GENERATED  
→ IMAGES_APPROVED  
→ PUBLISHED

Szabályok:

- Publish csak akkor engedélyezett, ha:
  - TEXT_APPROVED
  - legalább 1 scientific main image approved
  - 1 iconic image approved

---

## 5. Szöveg Generálás

Flow:

1. Admin kiválasztja a madarat.
2. "Generate dossier" gomb hívja a `POST /api/generate-bird-dossier` route-ot, `AI_MODEL_TEXT` használatával.
3. AI visszaadja a Field-Guide D1 JSON-t; a szerver Zod-sémával validálja.
4. `content_blocks` rekordot mentünk `blocks_json` és `generation_meta` mezőkkel, `review_status=draft`, majd a madár `status`-a `text_generated` lesz.
5. Admin review → `TEXT_APPROVED` (a fact_box reviewját külön rögzíteni kell, lásd T202).

Struktúra (`blocks_json`):

- `header` (title, subtitle, scientific_name, short_summary, opcionális region)
- `quick_traits` (legalább 3 { label, value } pár)
- `short_options` (pontos három rövid opció / tagline)
- `long_paragraphs` (legalább két hosszú bekezdés)
- `fact_box` (legalább két tény { label, detail })
- `fun_fact`
- `ethics_tip`
- `typical_places`

`generation_meta` tartalmazza a modell nevét, a prompt hash-ét és a generálás időpontját, így később nyomon követhető a promptváltozás.

Nincs runtime chat.
Nincs prompt szerkesztés UI-ban.

---

## 6. Kép Generálás

### 6.1 Image Variants v1

#### Scientific

1. main_habitat (standing + enyhe élőhely háttér)
2. standing_clean (semleges háttér)
3. flight_clean (repülő, semleges háttér)

#### Iconic

1. fixed_pose_icon_v1

---

### 6.2 Image Flow

1. TEXT_APPROVED után jelenik meg a "Generate Images" gomb
2. API route generál image-spec rekordokat
3. Image generation hívás
4. Storage upload
5. images rekord draft státuszban
6. Admin review → IMAGES_APPROVED

Nincs paraméterezhető prompt.
Nincs stílusválasztás.

---

## 7. Admin UI Oldalak

### 7.1 Login

- Loading
- Error
- Success

---

### 7.2 Dashboard

- Birds count by status
- Places count
- Phenomena count
- Quick create buttons

---

### 7.3 Entity List

- Search
- Status filter
- Empty state

---

### 7.4 Bird Editor

Tabs:

- General
- Text
- Images
- Publish

---
 
### 7.5 Yoga naplózó felület (Admin)

- Az admin felületen egy nap akár négy tevékenységet is tud fogadni: jógát (relax/strong), erősítést (könnyű/intenzív), ACL stabilitást (aktiváló rutin vagy stabilitási blokk) és futást. A heti sor ezekre egy-egy apró jelöléssel mutatja, mit logoltunk, a havi rács pedig színes pontokkal vagy ikonokkal az egyes napokban szereplő aktivitásokat; az ikonokat (ill. a pontok színeit) az `activity_logs` rekordokhoz kapcsolódó `activity_type` + kategória adja.
- A logokat a Supabase `activity_logs` táblája tárolja (D16): a `date` + `activity_type` egyediség biztosítja, hogy naponta csak egy bejegyzés létezzen az adott tevékenységhez; a rekordban van `category`, `label`, `exercise_id`, `duration_minutes`, `distance_km`, `intensity`, `notes`, és opcionálisan `metadata`.
- A Yoga kártya dropdownja a statikus könyvtárból és az előző napi logokból épül; a már meglévő jóga kiválasztása esetén csak megjegyzést adunk meg (a cím/hossz/intenzitás már ismert), az „Új jóga hozzáadása” gombra megnyíló formban viszont manualisan megadható cím, percben kerekített hossz, 1–3 csillagos intenzitás és komment. Új tételként bekerül a dropdownba, következő logolásnál már ebből lehet választani.
- Az ACL és erősítés kártyák a `TICKETS/yoga/acl_stabilitas_erosito_program.md` dokumentációban definiált rutint/gyakorlatokat használják; mindkét felület kártyákban jeleníti meg az egyes témákat (aktiváló rutin / stabilitási blokk és könnyű / intenzív), egy kártya kiválasztása után az adott sor a `details`-ban lévő gyakorlatlistát mutatja (gyakorlat neve + ismétlés, részletes leírás a lenyílóban), és a log gomb rögzíti a kiválasztott blokk címét+kategóriáját.
- A futás blokk csak azt rögzíti, hogy futottunk: egy opcionális `distance` (km) és/vagy `duration` (perc) mező, valamint egy jegyzet. Amennyiben nincs megadva méret, akkor a log is csak a „kijelölt futás” című rekordot menti.
- A havi rács, a heti sor és a log űrlap együtt mutatják a nap előrehaladását: a nap kiválasztásakor töltjük fel a kártyákat az adott naphoz tartozó `activity_logs` adatokkal, a naplózás után frissül a térkép, így mindig a kiválasztott nap áll rendelkezésre. Az architektúra jelenleg statikus könyvtárat használ, később a TICKETS/yoga mappa frissíthető további gyakorlatokkal.

---

## 8. Publish Gate Checklist

Publish előtt:

- kötelező mezők kitöltve
- TEXT_APPROVED
- main_habitat image approved
- iconic image approved

---

## 9. Modellhasználat

- Modellnév ENV-ből
- Nem hardcode-olunk konkrét "gpt-4" verziót
- Text és Image model külön konfigurálható

---

## 10. MVP Kész Definíciója

Az MVP kész, ha:

- Madár létrehozható
- Szöveg generálható
- Jóváhagyható
- Képek generálhatók
- Jóváhagyhatók
- Publish állapot elérhető
- Mindez stabil build mellett működik

## 11. Line endings policy
- The repo standard for Studio and Explorer sources is LF (line feed) endings only; .gitattributes now insists that .ts/.tsx/.css/.md/.json files are normalized to LF regardless of developer OS.
- Do not commit CRLF files; if Git keeps warning about CRLF, rerun git checkout -- <file> after updating core.autocrlf or syncing with the .gitattributes policy.

---

## Image Accuracy Pipeline v1 (Science Dossier → Visual Brief → Images)

### Goals
- Species-accurate images for an amateur bird guide:
  - scientific illustrations must support identification
  - iconic illustrations must still reflect real morphology and key markers
- Controlled, review-gated pipeline (no runtime AI dependency)

### Non-goals
- No external ornithology API integration in v1
- No Explorer flow changes

---

## Pipeline overview

### Preconditions
Image generation can only be triggered when:
- bird.status == text_approved
- bird.science_dossier_status == approved
- bird.visual_brief_status == approved

### Required image outputs
- scientific.main_habitat (REQUIRED)
  - full-body bird; dominant side view
  - very mild habitat hint (2–4 minimal elements)
  - vintage natural history / field-guide style; pale paper background
- iconic.fixed_pose_icon_v1 (REQUIRED)
  - bird-only (no habitat background)
  - habitat background is provided via stock assets (separate system)

### Optional image outputs (non-blocking)
- scientific.flight_clean (OPTIONAL)
  - clean background; wing structure visible
- scientific.nesting_clean (OPTIONAL)
  - preferred: nest + chicks visible
  - not blocking for publish

### Publish gate
Publish allowed only if:
- scientific.main_habitat review_status == approved
- iconic.fixed_pose_icon_v1 review_status == approved

---

## State machine (Bird + sub-statuses)

### Bird status (existing)
draft → … → text_approved → images_generated → images_reviewed → images_approved → published

### New sub-status fields
- science_dossier_status: none | generated | approved
- visual_brief_status: none | generated | approved

---

## Data model

### Table: bird_science_dossiers
- id uuid pk
- bird_id uuid fk → birds.id (indexed)
- schema_version text (e.g. "v1")
- payload jsonb (see schema below)
- review_status text enum: draft | approved | rejected
- created_at timestamptz
- updated_at timestamptz
- created_by text (ai|human)
- approved_by uuid nullable
- approved_at timestamptz nullable

### Table: bird_visual_briefs
- id uuid pk
- bird_id uuid fk → birds.id (indexed)
- schema_version text (e.g. "v1")
- payload jsonb (see schema below)
- review_status text enum: draft | approved | rejected
- created_at timestamptz
- updated_at timestamptz
- created_by text (ai|human)
- approved_by uuid nullable
- approved_at timestamptz nullable

### Images table (canonical)
images is canonical for generated assets with:
- style_family (scientific|iconic)
- variant (main_habitat|flight_clean|nesting_clean|fixed_pose_icon_v1)
- storage_path
- review_status (draft|approved|rejected)
- seed, style_config_id, spec_hash (recommended)

---

## Schemas (v1)

### bird_science_dossiers.payload (schema v1)
- species_identity:
  - name_hu
  - name_latin
- confusion_set: array of
  - species_name
  - quick_diff
- key_field_marks: array (max 8)
  - mark (e.g. "red crown patch", "black neck stripe")
- proportions:
  - neck (short|medium|long)
  - legs (short|medium|long)
  - body (slim|average|stocky)
  - beak (short|medium|long; straight|curved)
- plumage_variants:
  - adult (text)
  - juvenile (text|not_applicable)
  - breeding (text|not_applicable)
  - non_breeding (text|not_applicable)
- must_not_include: array (3–8)
- confidence:
  - per_section: high|medium|low
  - notes

### bird_visual_briefs.payload (schema v1)
- scientific:
  - main_habitat:
    - pose
    - composition_rules (e.g. "bird fills 70–80%")
    - habitat_hint_elements (2–4)
    - background_rules ("pale paper", "no scene perspective")
    - must_not (list)
  - flight_clean (optional):
    - flight_pose
    - wing_structure_notes
  - nesting_clean (optional):
    - nest_type
    - nest_material
    - chicks_visible (bool)
    - confidence (high|med|low)
- iconic:
  - silhouette_focus (2–3 key traits)
  - simplify_features (list)
  - color_guidance (optional)
  - must_not (list)
  - background: "none" (habitat provided externally)

---

## API (draft)

### POST /api/generate-science-dossier
- Preconditions: bird.status == text_approved
- Output:
  - upsert bird_science_dossiers (review_status=draft)
  - set birds.science_dossier_status = generated

### POST /api/approve-science-dossier
- Preconditions: admin/editor role
- Output:
  - set dossier.review_status = approved
  - set birds.science_dossier_status = approved

### POST /api/generate-visual-brief
- Preconditions: birds.science_dossier_status == approved AND bird.status == text_approved
- Output:
  - upsert bird_visual_briefs (review_status=draft)
  - set birds.visual_brief_status = generated

### POST /api/approve-visual-brief
- Preconditions: admin/editor role
- Output:
  - set brief.review_status = approved
  - set birds.visual_brief_status = approved

### POST /api/generate-images  (controlled; T007)
- Preconditions:
  - bird.status == text_approved
  - birds.science_dossier_status == approved
  - birds.visual_brief_status == approved
- Steps:
  - buildImageSpec(bird, visualBrief, scienceDossier)
  - generate required variants first (main_habitat + fixed_pose_icon_v1)
  - generate optional variants best-effort (flight_clean, nesting_clean)
  - upload to storage
  - upsert images rows with review_status=draft
  - set bird.status = images_generated ONLY IF required variants succeeded

---

## Error handling (v1)
- If required variant fails:
  - do not advance bird.status to images_generated
  - store per-variant failure in logs
- Optional variant failures never block required completion or publish gate.

---

## Studio UX (v1)

### Post text approval handoff
After approving Bird text (transition to `text_approved`), Studio navigates to an intermediate review screen to prepare image generation inputs:

- Science Dossier: review/edit structured, accuracy-first JSON, then approve.
- Visual Brief: review/edit structured, generation-oriented JSON, then approve.

These artifacts are the canonical “prompt inputs” for images. Studio does not expose raw prompt strings; prompt templating remains server-side.

### API (artifact editing)
In addition to the generator/approve endpoints above, Studio may persist manual edits to draft artifacts:

- `POST /api/birds/:id/science-dossier` (upsert draft payload; sets `birds.science_dossier_status=generated`)
- `POST /api/birds/:id/visual-brief` (upsert draft payload; sets `birds.visual_brief_status=generated`)
