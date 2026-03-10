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

**D24/D26 note (2026-03-08):** Bird distribution maps are catalog-driven. The AI must NOT generate polygon coordinates.
Instead, the system uses a server-side region catalog (ecoregions prioritized, fallback countries; HU Natura 2000 SPA for
the Hungary viewport), and the AI only selects `region_ids[]` per status layer. The server expands region IDs to GeoJSON
and persists `bird_distribution_maps.ranges[]`.

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
- Bird distribution map modul (D24): polygon alapú elterjedési zónák + közös legend (Studio)

### OUT (MVP-ben NINCS)

- Publikus Bird UI (Field Guide)
- Full Explorer map (Leaflet + OSM beyond Places)
- Journaling
- Közösségi funkciók
- Multi-role rendszer
- Külső adatforrás integráció
- Helyszín hangulatképek
- Promptolható képgenerálás

Explorer skeleton is a future phase, but a minimal, read-only Place map + panel is now in scope (D31) so Place entities can be previewed and published without waiting for the full Explorer buildout.
Current active scope: Studio generative engine for Bird content + Place system foundation (CRUD, AI text generation, review, publish gating) + minimal public Place map surface. Phenomenon workstream remains limited to planning until its data contracts and rendering are formally scoped.

### 2.x Leaflet map defaults (D39)

Applies to **display-only** maps (public `/places`, Admin Dashboard Places map, Bird distribution maps, Bird leaflets mini maps), unless explicitly noted.

- Static camera: fixed center+zoom per map surface; no user zoom/pan.
- Interactions disabled: zoom controls, scroll-wheel zoom, dragging, double-click zoom, touch zoom, keyboard, box zoom.
- Basemap: `basemap="bird"` (CARTO no-label tiles: `light_nolabels` / `dark_nolabels` chosen from system color scheme).
- Background: light = near-white, dark = dark UI-compatible. (Container may use transparent/white fallback while tiles load.)
- Overlay styling (marker / polygon colors) remains module-owned (per page/menu), as today.
- Exception: editor pickers (e.g. Place location picker) remain interactive.
- Exception (public `/places`, D40): `basemap="brand"` shows only Hungary border (brand-ink) on page-bg, with a theme-aware water fill; no roads/county borders; attribution hidden.

---

## 3. Entitások

### 3.1 Bird

Core mezők:
- id
- slug
- name_hu
- name_latin
- status (draft | text_approved | images_approved | published)
- size_category (optional; enum)
- visibility_category (optional; enum)
- classification_status (none | generated | approved)
- created_at
- updated_at

Kapcsolódó:
- content_blocks
- images

Kiegészítő meta (D18):
- A Studio `/admin/birds` oldalon a madarak szűrhetők/rendezhetők `size_category` (méret) és `visibility_category` (észlelhetőség) alapján.
- A kategóriák nem publish-gate feltételek (nem blokkolják a publish-t), kizárólag admin taxonómia / registry célokra szolgálnak.
- Ha bármelyik hiányzik, a madár bekerül a “Classification queue” listába, ahol AI-javaslat generálható és/vagy kézzel jóváhagyható.
- A Studio `/admin/birds` listaelemei a (ha elérhető) dossier `blocks_json.pill_meta.habitat_class` alapján megjelenítik a habitat ikont, és a `blocks_json.pill_meta.color_bg` alapján egy soft háttérszínt kapnak; ha van current `fixed_pose_icon_v1` (iconic) asset, akkor overlay-ként azt is (placeholder nélkül).
- A Studio `/admin` dashboard “Recent birds” listája ugyanazt a kétoszlopos (ikon + szöveg) megjelenítést használja.
- `visibility_category` jelentése Magyarországra értendő (D20). Kategóriák:
  - `common_hu`: általában gyakori Magyarországon (releváns évszakban/élőhelyen)
  - `localized_hu`: előfordul Magyarországon, de inkább helyi / foltszerű
  - `seasonal_hu`: főként egy adott szezonban látható Magyarországon (vonulás/költés/telelés)
  - `rare_hu`: ritkán látható Magyarországon
  - `not_in_hu`: nem látható Magyarországon (ide tartozik a nagyon-nagyon ritka/kóborló is)

---

### 3.2 Place

Core mezők:
- id
- slug
- name
- region_landscape
- place_type
- place_types (optional; always includes place_type)
- status

KiegĂ©szĂ­tĹ‘ mezĹ‘k (D31):
- county
- district
- nearest_city
- distance_from_nearest_city_km
- settlement (optional)
- location (optional; destination-level marker only)
- location_precision (exact|approximate|hidden)
- sensitivity_level (normal|sensitive)
- is_beginner_friendly
- access_note / parking_note / best_visit_note
- notable_units_json (informational sub-units; not separate Place entities in v1)
- generation_input (admin-only prompt seed)

Place UI content (Explorer panel contract, D34):
- Stored in `content_blocks.blocks_json` as versioned JSON with `schema_version="place_ui_variants_v1"`, `language="hu"`.
- Required blocks for publish: `variants.short`, `variants.ethics_tip`, and all `variants.seasonal_snippet.*` seasons (non-empty).
- Other variant strings may be empty; `variants.notable_units` is optional structured list of sub-areas.

Place → Birds relations (D35):
- Stored in `place_birds` (join table), using either:
  - `bird_id` (linked) OR
  - `pending_bird_name_hu` (pending; editor can later link/create a Bird)
- `review_status` is enforced server-side:
  - `suggested` = editor-assist suggestion; not public
  - `approved` = reviewed by editor; public
- Suggestion engine runs:
  - on Place quick-create generation
  - on Place content regeneration
  - on editor manual trigger ("Suggest birds")
- Explorer/public endpoints only show `place_birds.review_status="approved"` rows (no AI suggestions leaking to public).

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

- Field-Guide Dossier `schema_version: "v2.3"` (lásd D12, D28)
- `signature_trait`
- `header` (name_hu, name_latin, subtitle, short_summary)
- `pill_meta` (habitat_class, color_bg, region_teaser, size_cm, wingspan_cm, diet_short, lifespan_years)
- `short_options` (pontos három rövid opció / tagline)
- `long_paragraphs` (pontos két bekezdés)
- `identification` (key_features: 4 item, mindegyikhez `axis` (csor/tollazat/hang/mozgas) + dinamikus `title` + hosszabb `description`, + identification_paragraph) (lásd D28)

Megjegyzés:
- A Studio text review felületen a main_habitat kép alá kerül egy "Regenerate traits" gomb, ami csak az `identification` blokkot generálja újra (a többi dossier rész változatlan marad).
- `distribution` (taxonomy + iucn_status + distribution_regions + distribution_note)
- `nesting`
- `migration`
- `fun_fact`
- `did_you_know`
- `ethics_tip`
- `typical_places`
- `leaflets` (D22): régió-szintű elterjedés + HU-megfigyelhetőség jelölés (világ + Magyarország)

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

- Full-screen Hungary map (Leaflet; D39 static map defaults) showing **published** Places as markers.
  - Hover opens a popup card with: place name, location (place_type + county/nearest_city), `variants.short`, the **current season** snippet, and the **top 5** seasonal birds for that place.
  - Birds shown here are derived from `place_birds` **approved** links only (no suggested rows), and only **published** Bird entities are allowed to appear in the card.
  - Map shows only Places that are `status="published"` and not `location_precision="hidden"`.
- Under the map: “Habitat spotlights” in 3 columns: **vízpart**, **erdő**, **hegység**.
  - Each column lists ~7 birds (habitat icon + bird name), and links to one or more published Places where the bird is visible in the current season.
- “My sightings” panel: recent Bird sightings recorded by the current admin (timestamp + selected birds).
- Birds count by status (pipeline)
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

### 7.6 Chef receptek (Admin)

- Az admin felületen külön menüpont: `/admin/chef`.
- Új recept generálásakor két mezőt kérünk: recept név és rövid leírás (szabad szöveg). A generálás **server-side AI** hívással történik (D2/D3), és a válasz szigorúan validált JSON contract (v1).
- A generált recept canonical payloadja tartalmazza: `cook_time_minutes`, `servings` (alap: 2), `ingredients[]` (strukturált mennyiség), `steps[]` (lépéses folyamat).
- A recept adatlapon a servings értéke könnyen módosítható, és a UI kliens oldalon újraszámolja a hozzávalók mennyiségét (`amount` mező skálázása; ha `amount` null, nem skálázunk).
- Alul “Accept” gombbal a recept rögzíthető (review_status: `approved`). A lista alapértelmezetten csak az approved recepteket mutatja: név + elkészítési idő pill + top 5 hozzávaló.
- A recept adatlapon van külön “review note” mező: a jegyzet mentése után a rendszer regenerálja a receptet (review_status: `draft`), majd “Accept”-tel ismét jóváhagyható. Mentés felülírható (A), de minden művelet auditálható metadatával (model + időbélyeg).
- Explorer nem fogyaszt Chef tartalmat (Admin-only).

---

### 7.7 Birdwatch sightings (Admin)

- Studio-only quick logging for “I saw this bird” records (Explorer is out of scope).
- A fixed sticky button is available in the bottom-left corner on all protected Studio admin pages.
  - Icon: `public/icon_birdwatch.svg`.
  - Opens a popup panel for recording sightings.
- The popup panel (v1) supports:
  - First: selecting a Place from the registry (searchable list).
  - Then: selecting one or more Birds via a searchable, filterable list.
    - Filters include: `color_tags` (multi), `size_category`, `visibility_category`, plus free-text search on bird name.
    - Recommendation ordering: Birds linked to the selected Place (approved links) are prioritized, but not exclusive.
- Saving a sighting stores:
  - `seen_at` timestamp (defaults to now),
  - `created_by` (admin user id),
  - `place_id` (selected Place),
  - selected `bird_id` links (with optional per-bird quantity later; v1 defaults to 1).
- The `/admin` Dashboard shows the most recent “My sightings” list for the current admin.

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
- A Studio admin UI mobil nézeten is használható (<= 420px), és minden UI változtatásnál párhuzamosan ellenőrzött (D29)

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
- Preconditions: bird.status == text_approved OR images_generated
- Output:
  - upsert bird_science_dossiers (review_status=draft)
  - set birds.science_dossier_status = generated

### POST /api/approve-science-dossier
- Preconditions: admin/editor role
- Output:
  - set dossier.review_status = approved
  - set birds.science_dossier_status = approved

### POST /api/generate-visual-brief
- Preconditions: bird_science_dossiers exists AND bird.status == text_approved OR images_generated
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
  - bird.status == text_approved OR images_generated OR images_approved
- Steps:
  - prompt inputs:
    - default: use Field-Guide dossier only
    - optional: Science Dossier + Visual Brief can be included via `IMAGE_ACCURACY_INPUTS` (off|auto|approved)
    - per-variant review note (if any): current `images.review_comment` is passed to the prompt as `review_note`
  - buildImageSpec(bird, visualBrief, scienceDossier)
  - generate required variants first (main_habitat + fixed_pose_icon_v1)
  - generate optional variants best-effort (flight_clean, nesting_clean)
  - lock rule: variants with a current `review_status=approved` image are NOT regenerated/overwritten (they remain current)
  - regeneration rule: only missing, draft, or reviewed variants are regenerated
  - upload to storage
  - create a new image row per variant and mark it current:
    - images are versioned; exactly one current image exists per (entity_id, style_family, variant)
    - regeneration/upload creates a new row, flips previous current to non-current
  - reset images.review_status=draft on overwrite/regeneration
  - set bird.status = images_generated ONLY IF required variants succeeded

---

## Error handling (v1)
- If required variant fails:
  - do not advance bird.status to images_generated
  - store per-variant failure in logs
- Optional variant failures never block required completion or publish gate.

---

## Studio UX (v1)

### Status coloring rule (global)
Whenever Studio needs to colorize or badge Bird pipeline statuses, it must follow the dashboard convention:

- Use `StatusPill` for Bird statuses.
- Never introduce ad-hoc colors for statuses outside the `status-pill--*` rules in `src/app/globals.css`.

### Text coloring rule (global)
Whenever Studio needs to colorize text (labels, headings, help text, warnings, errors), it must follow the Dashboard conventions and the semantic text-role mapping in `UI_DESIGN_STOCK.md`:

- Prefer semantic helper classes in `src/app/globals.css` (token-driven via CSS variables).
- Avoid hardcoded hex colors and Tailwind color utilities (`text-*`, `bg-*`, `border-*`) in Studio pages/components.
- Exception: `/admin/yoga` is allowed to diverge (see D16), but should still remain token-backed.

### Post text approval handoff
After approving Bird text (transition to `text_approved`), Studio navigates directly to the image review page.

Science Dossier + Visual Brief remain the canonical prompt inputs for images, but Studio does not require an intermediate handoff step before image generation.

- On first image generation, the server bootstraps missing prompt inputs as drafts.
- The `/image-accuracy` screen remains available for optional review/edits/approval of those artifacts.

### API (artifact editing)
In addition to the generator/approve endpoints above, Studio may persist manual edits to draft artifacts:

- `POST /api/birds/:id/science-dossier` (upsert draft payload; sets `birds.science_dossier_status=generated`)
- `POST /api/birds/:id/visual-brief` (upsert draft payload; sets `birds.visual_brief_status=generated`)
