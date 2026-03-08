# Szárnyfeszítő – Döntésnapló

---

## D26 â€” Distribution maps: region-catalog-based generation v1

**Status:** Accepted  
**Date:** 2026-03-08  
**Scope:** Studio-only (server-side generation + admin rendering). Explorer out of scope.

### Context
D24 allowed the AI to emit freeform GeoJSON polygon coordinates. In practice this is too error-prone and non-deterministic.
We already maintain authoritative region geometries (ecoregions, countries, HU Natura 2000 SPA) that can be generated offline
from source layers.

### Decision
1) Introduce a region catalog store (server-only) containing authoritative MultiPolygon geometries:
   - Global: RESOLVE ecoregions (priority), Natural Earth Admin 0 countries (fallback)
   - Hungary: Natura 2000 SPA polygons (used only for HU viewport)
2) Distribution map generation becomes **selection-only**:
   - The AI must NOT output polygon coordinates.
   - The AI outputs `region_ids[]` grouped into distribution `status` layers + optional `note` + `confidence`.
3) The server expands `region_ids[]` into GeoJSON geometries from the catalog and persists the final `ranges[]` payload
   into `bird_distribution_maps` (same table as D24).
4) Candidate regions presented to the AI are narrowed using existing dossier leaflets v2 regions (macro bounds), to keep
   prompts small and the choice set relevant.

---

## D25 — Image generation without accuracy gating (prompt inputs auto-bootstrap)

**Status:** Accepted  
**Date:** 2026-03-07  
**Scope:** Studio Bird pipeline (text → images → publish). Explorer out of scope.

### Context
The D17 “Image Accuracy Pipeline” adds an intermediate review/approval step (Science Dossier + Visual Brief) between `text_approved` and image generation.
In practice this “stepping” slows down iteration: editors want to approve text and immediately generate the first required images, while still keeping the structured artifacts for audit and optional tuning.

### Decision
1) **Remove accuracy gating from image generation.**
   - `POST /api/generate-images` is allowed when `bird.status` is `text_approved` (or `images_generated` with `force_regenerate=true`).
   - It no longer requires `birds.science_dossier_status == approved` and `birds.visual_brief_status == approved`.
2) **Auto-bootstrap prompt inputs on first run.**
   - If a Science Dossier or Visual Brief record is missing, the server generates and stores it as a `draft` before generating images.
3) **Keep `/image-accuracy` as an optional surface.**
   - Editors may still review/edit/approve Science Dossier + Visual Brief, but approvals are no longer a prerequisite for generating images.

### Publish gate (unchanged)
Publish remains gated on the required image variants being approved (see D6 + D5).

### Consequences
- Faster “text approval → first two images” loop (main_habitat + fixed_pose_icon_v1).
- Structured artifacts remain available for auditability and future tightening of the pipeline.

## D19 — Studio text roles + coloring semantics v1 (Dashboard as baseline)

**Status:** Accepted  
**Date:** 2026-03-06  
**Scope:** Studio admin surfaces. Explorer out of scope. Yoga page is an explicit exception.

### Context
The Studio UI currently mixes:
- semantic helper classes backed by `src/app/globals.css` tokens (best example: `/admin` Dashboard), and
- ad-hoc Tailwind color utilities / per-page CSS modules with hardcoded hex colors (harder to maintain and drift-prone).

This makes it unclear which *kind of text* (label, title, help, warning, error, etc.) should look like what, and increases the cost of global palette tweaks.

### Decision
1) **Dashboard is the canonical visual baseline** for Studio typography + color semantics (except Yoga).
2) **Text styling must be semantic and global-first:**
   - prefer global helper classes in `src/app/globals.css` (driven by CSS variables),
   - avoid Tailwind color utilities (`text-*`, `bg-*`) and hardcoded hex values in admin pages/components,
   - when a missing role appears (e.g. error/success callouts), add a new global helper class in `src/app/globals.css` and document it in `UI_DESIGN_STOCK.md` before using it.
3) **Canonical mapping lives in `UI_DESIGN_STOCK.md`** under “Text roles (dashboard baseline)”.

### Exceptions
- `/admin/yoga` keeps its own surface rules (still token-backed, but not forced to match Dashboard’s text roles 1:1).

### Out of scope
- Implementing the refactor across every page/component (tracked separately under the style-system tickets).

### Open questions
- Should `/admin/login` be fully Dashboard-aligned (paper background + brand tokens), or is a “dark entry gate” acceptable as a permanent exception alongside Yoga?

## D18 — Bird size + visibility classification (Studio filters + AI suggestion queue)

**Status:** Accepted  
**Date:** 2026-03-06  
**Scope:** Content Studio (Admin Birds registry UX). Explorer out of scope.

### Context
The Studio `/admin/birds` list needs a stable way to filter and sort birds by:
- size category (Hungarian “méret” buckets)
- visibility / encounter frequency (Hungarian “elterjedtség / észlelhetőség” buckets)

The core `BirdDossier` payload contains numeric size ranges (`pill_meta.size_cm`) but does not define canonical list-filter fields, and visibility frequency is not reliably derivable without explicit metadata.

### Decision
Introduce a reviewable “classification” layer for Birds:

1) Persist **final** categories on `birds`:
- `size_category`: very_small | small | medium | large
- `visibility_category`: frequent | seasonal | rare
- `classification_status`: none → generated → approved

2) Add a dedicated, auditable artifact table `bird_classifications`:
- Stores AI suggestions + rationale as JSONB (schema v1)
- Review status: draft → approved (or rejected)

3) Add a Studio “Classification queue”:
- Lists birds missing either category
- Allows generating AI suggestions server-side (no runtime AI in UI)
- Allows manual selection + approval to write final categories onto `birds`

### Size bucket thresholds (cm)
- very_small: < 12
- small: 12 ≤ x < 20
- medium: 20 ≤ x ≤ 40
- large: > 40

For dossiers that provide ranges, derive using the midpoint when possible; otherwise use the available bound. If no numeric size is available, size remains unset until manual approval.

### Rationale
- Keeps list filters deterministic and queryable without reinterpreting dossier text in the UI.
- Preserves auditability: suggestions are stored, reviewed, and only approved values are used as canonical `birds` fields.

---

## D20 — Visibility categories are Hungary-scoped (add `not_in_hu`)

**Status:** Accepted  
**Date:** 2026-03-06  
**Scope:** Content Studio (Admin Birds registry UX). Explorer out of scope.

### Context
The original D18 `visibility_category` buckets (`frequent | seasonal | rare`) were not explicit about geography.
For the Studio registry, admins need a stable **Hungary-scoped** notion of how likely a bird is to be seen in
Hungary. We also need an explicit state for birds that are **not observable in Hungary** (including extremely
rare/accidental non-resident occurrences).

### Decision
1) Replace the canonical `birds.visibility_category` taxonomy with Hungary-scoped buckets:
- `common_hu`: generally common / often encountered in Hungary (in the relevant season/habitat)
- `localized_hu`: present in Hungary but mainly local / patchy (region- or habitat-bound)
- `seasonal_hu`: mainly observable in Hungary during a limited season (migration / breeding / wintering)
- `rare_hu`: rarely observable in Hungary (scarce)
- `not_in_hu`: not observable in Hungary (includes extremely rare / accidental / vagrant occurrences)

2) Update the classification suggestion payload schema to `v2` so AI + manual approvals use the new values.

3) Backfill mapping for existing canonical values (migration step):
- `frequent` → `common_hu`
- `seasonal` → `seasonal_hu`
- `rare` → `rare_hu`

### Rationale
- Makes the registry meaning explicit and auditable (“visible in Hungary”) without client-side inference.
- Adds an explicit, queryable bucket for “not in Hungary”, which is operationally important for curation.
- Allows incremental enrichment without blocking the publish pipeline.

### Out of scope
- External bird databases/APIs to source true distribution statistics.
- Explorer UX changes.

---

## D22 — Bird leaflets v1 (region heatmaps for world + Hungary)

**Status:** Accepted  
**Date:** 2026-03-07  
**Scope:** Studio Bird dossier (Text tab). Explorer out of scope.

### Context
The Bird dossier UI currently shows two “Leaflet placeholder” panels. Studio needs a deterministic, review-friendly
way to render *where the bird can be seen* on:
1) a world view (distribution), and
2) a Hungary view (where to look / how observable).

We do not integrate external distribution databases in MVP (e.g. eBird/GBIF), so the maps must be region-level and
derived from existing Studio artifacts (bird + dossier), without client-side inference.

### Decision
1) **Leaflets live inside the canonical Bird dossier payload** (`content_blocks.blocks_json.leaflets`) as a v1 schema,
so the Text review surface can render them without stitching multiple sources.
2) **Region-level only (v1):**
   - World: coarse macro-regions (not per-country precision).
   - Hungary: 7 NUTS-2 style regions.
3) **Generated with text by default**, using `AI_MODEL_TEXT`.
4) **Per-bird backfill only:** add an admin-only “Backfill leaflets” action on the Bird Text page that retroactively
generates *only* the `leaflets` payload for existing dossiers (no text rewrite).

### Data contract (v1)
`leaflets.schema_version = "leaflets_v1"` with:
- `leaflets.world.regions[]` (region code + weight/intensity + short rationale)
- `leaflets.hungary.regions[]` (region code + weight/intensity + short rationale)
- per-map notes for uncertainty/seasonality

### Out of scope
- External bird databases/APIs and “true” occurrence heatmaps.
- Explorer map UX.

---

## D23 — Leaflets v2 (list-based regions + filled map areas)

**Status:** Accepted  
**Date:** 2026-03-07  
**Scope:** Studio Bird dossier (Text tab). Explorer out of scope.

### Context
Leaflets v1 used per-region intensity + short rationales. The desired UX is closer to classic range maps:
- a small number of solid colors,
- clearer “which areas” semantics (list-based region membership),
- more granular world nomenclature than continents.

### Decision
1) Introduce `leaflets.schema_version = "leaflets_v2"` and keep v1 accepted for legacy dossiers.
2) v2 payload is **list-first**:
   - `world.present[]` and `hungary.present[]` are arrays of region codes.
   - optional `hover_hu` strings provide short Hungarian hover context per map (not required to encode coverage).
3) Rendering uses filled region areas (no heat circles). Geometry is deterministic and can be refined later without changing the payload schema.

---

## D24 — Bird distribution maps v1 (GeoJSON polygon ranges + shared legend)

**Status:** Accepted  
**Date:** 2026-03-07  
**Scope:** Studio Bird page module (two maps: global + Hungary viewport). Explorer out of scope.

### Context
Leaflets are a lightweight, region-coded approximation. The desired “species distribution” UX is closer to classic
range maps: polygon-based zones (not point observations) with status layers (resident/breeding/wintering/passage),
shared legend toggles, and strict AI-generated structured data stored in Supabase.

### Decision
1) Introduce a dedicated Supabase table `bird_distribution_maps` keyed by `bird_id` storing:
   - `summary`, `references[]`, and a JSONB `ranges[]` array.
2) `ranges[]` entries are **GeoJSON Polygon/MultiPolygon** with:
   - `status` enum: resident | breeding | wintering | passage
   - `confidence` (0..1) informational only
   - optional `note` for tooltips
3) Rendering:
   - Two viewports (global + Hungary) over the same dataset in MVP.
   - Layer order: resident → breeding → wintering → passage.
   - Fill colors fixed; no borders.
   - Legend toggles are shared across both maps.
4) Generation:
   - Server-side only, strict JSON + GeoJSON validation.
   - Per-bird “Generate/Regenerate distribution map” action in Studio.



## D17 — Image Accuracy Pipeline v1 (Science Dossier + Visual Brief gating)

**Status:** Superseded by D25  
**Date:** 2026-03-05  
**Scope:** Content Studio (Bird text+image review + publish gating). Explorer out of scope.

**Note:** Science Dossier + Visual Brief remain in the system, but image generation is no longer gated on their approval (see D25).

### Context
The app is an amateur bird guide; images must be species-accurate and identification-friendly (scientific family especially, but also iconic).
Existing user-facing text dossiers are not sufficiently deterministic to drive reliable image generation.

### Decision
Introduce a dedicated, reviewable accuracy layer between TEXT_APPROVED and image generation:

1) **Science Dossier** (structured, identification-oriented, accuracy-first)
2) **Visual Brief / Shot List** (image-generation oriented composition + constraints)

**Image generation is gated** on both being approved.

### Required outputs
- scientific.main_habitat — REQUIRED (full-body bird + very mild habitat hint)
- iconic.fixed_pose_icon_v1 — REQUIRED (bird-only; habitat background comes from stock assets)

### Optional outputs (non-blocking)
- scientific.flight_clean — OPTIONAL
- scientific.nesting_clean — OPTIONAL (preferred: nest + chicks, but not blocking)

### Publish gate
Publish is allowed only if:
- scientific.main_habitat is approved
- iconic.fixed_pose_icon_v1 is approved

Optional variants must not block publish.

### State machine additions
Add two sub-status fields to birds:
- science_dossier_status: none → generated → approved
- visual_brief_status: none → generated → approved

Image generation is allowed only if:
- bird.status == text_approved
- science_dossier_status == approved
- visual_brief_status == approved

### Data model
Add a new table:
- bird_science_dossiers (jsonb payload + review_status)

Add / reuse a table for visual briefs:
- bird_visual_briefs (jsonb payload + review_status)

### Rationale
- Separates user-facing narrative text from generator-driving accuracy inputs.
- Reduces hallucination risk via structured “field marks”, “must_not”, and “confusion set”.
- Enables deterministic prompt templating and consistent style output at scale.

### Consequences
- Studio UI adds one additional review step (Science Dossier + Visual Brief).
- Image pipeline becomes more reliable; regenerate operations become auditable.

### Out of scope
- Integrating external bird databases/APIs.
- Explorer UX changes.

## D11 â€“ Publish CTA szerinti állapotvédelem

- A Publish CTA csak akkor jelenik meg, ha a madár státusza legalább az `images_approved`, és az összes GateChecklist-kritérium (text_approved státusz, legalább egy `main_habitat` és a `fixed_pose_icon_v1` jóváhagyott) teljesült.
- A StatusPill, GateChecklist és maga a CTA ugyanarra a `BIRD_STATUS_VALUES` sorrendre épül, így a státuszfolyam logikája közvetlenül vezérli a publikus lépéseket.
- A CTA a `/api/birds/:id` PATCH hívásával állítja `published`-ra a madár státuszát, tehát a backend is kap visszajelzést a státuszváltásról.

Indok: A publish művelet csak akkor válik elérhetővé, amikor a SPEC-ben leírt text/images jóváhagyások megvannak, és így a frontend nem engedélyezi a publikálást, amíg a szöveg és a fő habitat + ikonikus kép nem lett approved.

## D12 – Dossier schema v2.2 Field-Guide upgrade

- Bird dossier content_blocks továbbra is egy JSON struktúrát tartalmaz: mostantól mindegyik draft `schema_version` mezője "v2.2", a payload pedig signature_trait-et, header-t, pill_meta-t, short_options-t (három 90–170 karakteres tagline), long_paragraphs-t (2–5 bekezdés), identification-t (kulcsjellemzők + összegző bekezdés), distribution-t (taxonómia + IUCN + régiók + jegyzet), nesting-et, migration-t, valamint a fun_fact, ethics_tip és typical_places blokkokat tartalmazza.
- A schema szigorú validációval (`z.strict()`) ellenőrzi a mezők jelenlétét, a stringek trimelt állapotát, a minimális számú bejegyzéseket és a short_option karakterhosszt, így ígérvén új, granularizált review útvonalat a blokkoknak.
- A signature_trait mező bevezetése óta egy minőségi kapu ellenőrzi, hogy a header.short_summary, a long_paragraphs és a short_options mind ugyanazon jellegzetesség köré építse a narratívát; a kapu megsértése AIQualityGateError-t eredményez és részletezi az eltérés okát.
- Új generáció csak v2.2 payloadot hozhat létre; ha legacy v1 dossierhoz nyúlunk, azt nem automatikusan migráljuk, de továbbra is lenni kell neki, amíg a pipeline nem migrált visszafelé. A korábbi `fact_box`/`quick_traits` blokkokat centralizáltan a pill_meta/identification/distribution-csoportok váltják fel.

Indok: így készült el a kontrollált Field-Guide architektúra, ami a későbbi illustrációs és finomhangolási hookokat megengedi, ugyanakkor megőrzi a meglevő route-okat és data model szerkezetet.

## D1 – Admin-only MVP

A kezdeti verzió kizárólag admin felület.
Nincs publikus UI.
Nincs térkép.

Indok: stabil tartalomgyártási alap.

---

## D2 – AI nem runtime függőség

Generálás csak admin oldalon.
Felhasználói UI nem vár generálásra.

Indok: stabilitás és kontroll.

---

## D3 – Next.js API route generálás

AI hívások Next.js API route-on keresztül történnek.
Nincs külön generálási service réteg MVP-ben.

Indok: gyors, de kontrollált indulás.

---

## D4 – Modell konfigurálhatóság

A használt modellek ENV változóban vannak definiálva.
Nem hardcode-olunk verziót.

Indok: modellciklusok gyors változása.

---

## D5 – Image Variants v1

Scientific:
- main_habitat
- standing_clean
- flight_clean

Iconic:
- fixed_pose_icon_v1

Indok: kontrollált vizuális konzisztencia.

---

## D6 – Publish Gate

Publish csak akkor engedélyezett, ha:

- TEXT_APPROVED
- main_habitat image approved
- iconic image approved

Indok: minőségbiztosítás.

---

## D7 – Nincs promptolható UI

Admin nem ír promptot.
Minden generálás rögzített style_config alapján történik.

Indok: brand és konzisztencia védelme.

---

## D10 – Idő alapú theme váltás

- Az inline `timeThemeScript` eltávolítva, hogy React szerver oldali markupja ne mutáljon eltérést a klienssel, ami a hydration mismatch hibát okozta.
- A `prefers-color-scheme: dark` blokk most csak addig érvényes, amí­g a kliens még nem állí­totta be a `data-time-theme` attribútumot, í­gy a napszak által vezérelt sötét/világos paletta nyeri előnyt.

Indok: ez garantálja, hogy a szerver-és kliens-oldali megjelení­tés a napszak szerint változtat, miközben megszünteti a hydration mismatch és a konzolban látott hibát.

## D8 – Bird quick-create slug generation

- Slugot mindig a Latin névből képezünk: trim, NFD normalizálás, ékezetek eltávolítása, kisbetűsítés, nem alfanumerikus karaktersorozatokat kötőjellel cserélünk, majd a többszörös kötőjeleket és kezdő/végző kötőjeleket levágjuk.
- Ha a bazis slug már foglalt, a `birds.slug` lekérdezésével keresünk összes egyező prefixet, és `-2`, `-3`, … suffixokkal lépünk addig, amíg nem találunk szabad értéket. Ez biztosítja a determinisztikus, collision-safe gyors létrehozást.

Indok: a pipeline automatikusan slugol minden Quick Create kérést, így biztosított a stabil URL-formátum és az ismételt Latin nevek determinisztikus kezelése.

---

## D9 – Field-Guide D1 dossier + metadata

- Bird tartalmakat a `content_blocks.blocks_json` mezőben tároljuk, mert így megőrizzük a Field-Guide D1 struktúrát (header, quick_traits, short_options, long_paragraphs, fact_box, fun_fact, ethics_tip, typical_places) anélkül, hogy az adatmodell sok külön mezőt kapna.
- Minden generálás `generation_meta` (model, prompt_hash, generated_at) metadatával együtt kerül mentésre, így később vissza tudjuk vezetni a prompt-ot, és a prompt_hash segítségével össze tudjuk vetni a különböző generációkat.
- review_status továbbra is `draft`, a madár `status`-a `text_generated`, hogy megegyezzen a pipeline állapotfolyammal.

Indok: ez teszi lehetővé a szigorú validálást, a generációk verifikálását és a későbbi traceability-t.

---
## D13 â€“ Explorer planned phase (not active development)

- Explorer is acknowledged as the long-term read-only surface described in AGENTS.md, but delivering Explorer assets (UI variants, map overlays, published experiences) is a roadmap intention only. No implementation work for Explorer-specific pages, feeds, or gating happens during the current Studio-centric phase.
- Indok: Keeps the team aligned on the Studio-only MVP while preserving the Explorer direction for future F0â€“F4 cycles.

## D14 â€“ Place/Phenomenon text-only pipeline

- Places and Phenomena follow AI text generation plus review, then publish, but they do not require image generation or image-based gating. Their publish transitions depend solely on approved textual content and metadata validation.
- Indok: Differentiates these entities from Bird so we donâ€™t overburden the MVP, yet keeps them ready for the Explorer panels once the read-only surface is active.

---

## D15 â€“ F3 builds mandate paired F4 checks

- Every F3 (Build) engagement that touches implementation code — especially any high-impact or “really big” change — must simultaneously plan, trigger, and document the corresponding F4 (Check) work before the change is closed, so the audit workflow always shows the validation evidence alongside the build.
- Indok: This guarantees that important implementations stay traceable in the repo and that the agent never leaves automation or manual validation undocumented, matching the request to keep F3 and F4 coupled.

---

## D16 â€“ Admin-only Activity journaling surface

- The Yoga surface is exposed at `/admin/yoga`, added to the admin nav, and guarded by `getAdminUserFromCookies` so Explorer never sees it, and it now documents four activity types (yoga, strength, acl, running).
- A generalized `activity_logs` table persists daily entries with `(date, activity_type)` uniqueness; columns include `category`, `label`, `exercise_id`, `duration_minutes`, `distance_km`, `intensity`, `notes`, and optional `metadata`. Logs are upserted via the authenticated `/api/activity-logs` GET/POST endpoints.
- The frontend consumes static metadata lists (yoga library, ACL routines, strength workouts, running defaults) plus live logs to build dropdowns and card selectors; each saved row is treated as the canonical payload for rendering the weekly selector, dropdown states, and monthly grid so semantics stay centralized in Studio.
- Indok: this keeps the expanded journaling surface within the Studio guardrails, reuses the existing auth/API flow, and keeps Explorer-free until the feature is finalized while producing a structured activity contract for future Explorer consumers.
