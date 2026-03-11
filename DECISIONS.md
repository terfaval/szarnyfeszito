# Szárnyfeszítő – Döntésnapló

---

## D50 - Bird: sex comparison block + duo image refill v1 (Studio)

**Status:** Accepted  
**Date:** 2026-03-11  
**Scope:** Studio only (admin + published view). No Explorer/runtime AI changes.

### Context
- Published Birds often miss a short "male vs female" comparison + a duo illustration.
- The Bird publish gate (D6) must remain stable and required-variants-only.

### Decision
- Add an optional canonical dossier sub-block: `content_blocks.blocks_json.sex_comparison`:
  - schema_version: `sex_comparison_v1`, language: `hu`
  - review_status: `draft|reviewed|approved`
  - summary (2-4 sentences) + key_differences (exactly 3)
  - generation_meta for traceability (model + prompt_hash + generated_at; optional review_comment)
- Add an optional scientific image variant: `images.variant="main_habitat_pair_sexes_v1"` (male + female together).
- Publish gate stays unchanged (D6): this block + image are optional (not required).
- Add a Studio refill page: `/admin/birds/refill/sex-comparison` for backfilling published birds.
- Post-publish rule: only `main_habitat_pair_sexes_v1` may be generated after publish; required variants remain blocked.

### Out of scope (v1)
- Explorer Bird panel integration.
- Extending publish gate to require sex comparison assets.

---

## D29 — Continuous mobile UX iteration + paired checks (Studio)

**Status:** Accepted  
**Date:** 2026-03-09  
**Scope:** Studio admin surfaces (mobile + desktop). Explorer out of scope.

### Context
Even though the MVP is Studio-only, admin work often happens on smaller screens (narrow laptop windows, tablets, phones).
If we only validate desktop layouts, UI regressions slip in unnoticed and accumulate into costly cleanups.

### Decision
1) **Mobile is a first-class surface for Studio.**
   - Every Studio UI change must be verified on a narrow viewport (<= 420px) in addition to desktop.
2) **F3 builds must include a paired F4 check for mobile.**
   - For UI work, "done" includes a quick manual smoke on both widths (no pixel-perfect requirement, but no overflow, no hidden CTAs).
3) **Mobile guardrails live in `UI_DESIGN_STOCK.md`.**
   - If a new pattern is introduced (e.g. disclosure navigation, sticky actions), document the rule before spreading it.

### Consequences
- Small, continuous adjustments replace periodic large rewrites.
- UI regressions are caught at the change that introduced them (cheaper to fix).

## D27 — Post-publish revisions + image versioning v1

**Status:** Accepted  
**Date:** 2026-03-08  
**Scope:** Studio Bird pipeline only. Explorer out of scope.

### Context
Birds can be published once text + required images are approved. In practice we need:
- A controlled way to update a published bird ("republish") with an explicit timestamp.
- A safe way to upload/replace images without losing the previous asset (auditability and Studio-only rollback).

### Decision
1) **Introduce image versioning in `images`.**
   - Multiple image rows may exist per `(entity_type, entity_id, variant)`.
   - Exactly one row is marked `is_current=true` for each variant.
   - Regeneration or manual upload creates a new row and flips the previous current row to `is_current=false`.
2) **Add batch image approvals.**
   - Studio provides "Approve required" (main_habitat + fixed_pose_icon_v1) and "Approve all" for current variants.
3) **Allow controlled republish.**
   - Publishing records `published_at`.
   - Republish is an explicit action available only when publish gates are green again.
   - Republish updates `published_at` and increments `published_revision`.

### Consequences
- Studio keeps a canonical "current" image set while retaining historical assets/rows.
- Published birds can be revised without silent overwrites; changes always require explicit republish when gates pass.

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

- Phenomena follow AI text generation plus review, then publish, and they do not require image generation or image-based gating. Their publish transitions depend solely on approved textual content and metadata validation. (Places later gain a single publish-gated hero image; see D42.)
- Indok: Differentiates these entities from Bird so we donâ€™t overburden the MVP, yet keeps them ready for the Explorer panels once the read-only surface is active.

---

## D48 – Phenomenon: SPA migration peak generation + bird linking v1 (Studio)

- Phenomenon v1 targets a **region catalog entry** (not a Place):
  - `phenomena.region_id` references `distribution_region_catalog_items.region_id` and is restricted to `type="spa"` entries for the HU scope.
- The canonical v1 use-case is “**vonulási csúcs**”:
  - `phenomenon_type="migration_peak"`, plus a required `season` (`spring` or `autumn`) and a `typical_start_mmdd` → `typical_end_mmdd` yearly window (MM-DD).
  - Drafts may leave timing null; publish requires timing fields to be present and valid.
- “Minden SPA-hoz legalább 1” enforcement (v1):
  - The system ensures **at least one** `migration_peak` phenomenon per SPA (default: `autumn`).
  - A second season (typically `spring`) is created only by an explicit editor action (to avoid “hallucinated” events).
- Text generation contract (v1):
  - Phenomenon narratives are stored in `content_blocks.blocks_json` as a strict UI contract `schema_version="phenomenon_ui_variants_v1"`, `language="hu"`.
  - The contract is Zod-validated; AI output must be JSON-only; generation is server-side only.
- Bird linking (v1):
  - Phenomenon links visible birds via `phenomenon_birds` with `review_status` (`suggested|approved`) mirroring Place behavior.
  - Bird suggestion can run automatically during generation and/or via a manual “Suggest birds” editor button, and it must only consider **published** Bird entities as link targets.
  - Publish gate requires at least **one** `phenomenon_birds.review_status="approved"` link (editorial guideline: 5–12).

Indok: A SPA-scoped migration peak is a stable, deterministic primitive that can be generated and reviewed in Studio without leaking runtime AI to Explorer, while still producing a publish-gated, linkable phenomenon contract for future read-only rendering.

---

## D49 – Studio Phenomenon UI: list + editor tabs v1

- Studio adds a Phenomenon management surface aligned with Birds/Places patterns:
  - List: `/admin/phenomena` (search + status filter + create tools).
  - Editor: `/admin/phenomena/[phenomenonId]` with tabs: General, Birds, Content, Publish.
- List tools:
  - Primary action: “Ensure SPA autumn peaks” — creates missing `migration_peak/autumn` phenomena for all HU SPA catalog entries.
  - Manual create: select SPA region + season (spring|autumn) without auto-creating a second season by default.
- Content workflow:
  - Generate uses server-side AI only and writes `content_blocks.blocks_json` with `schema_version="phenomenon_ui_variants_v1"`.
  - Approve marks the latest phenomenon content block as `review_status="approved"` and sets phenomenon status to `reviewed` unless already published.
- Publish gate (server-enforced):
  - Timing window (`typical_start_mmdd` + `typical_end_mmdd`) present and valid
  - Approved phenomenon content exists
  - At least 1 approved bird link where the Bird entity is published

Indok: Phenomena need the same deterministic, review-gated authoring ergonomics as Places, but remain Studio-first until Explorer rendering is formally scoped.

---

## D15 â€“ F3 builds mandate paired F4 checks

- Every F3 (Build) engagement that touches implementation code — especially any high-impact or “really big” change — must simultaneously plan, trigger, and document the corresponding F4 (Check) work before the change is closed, so the audit workflow always shows the validation evidence alongside the build.
- Indok: This guarantees that important implementations stay traceable in the repo and that the agent never leaves automation or manual validation undocumented, matching the request to keep F3 and F4 coupled.

---

## D16 â€“ Admin-only Activity journaling surface

- The Yoga surface is exposed at `/admin/yoga`, added to the admin nav, and guarded by `getAdminUserFromCookies` so Explorer never sees it, and it now documents four activity types (yoga, strength, acl, running).
- A generalized `activity_logs` table persists daily entries (insert-based journaling; **multiple rows per day/activity are allowed**); columns include `category`, `label`, `exercise_id`, `duration_minutes`, `distance_km`, `intensity`, `notes`, and optional `metadata`. Logs are managed via the authenticated `/api/activity-logs` GET/POST/PATCH/DELETE endpoints.
- The frontend consumes static metadata lists (yoga library, ACL routines, strength workouts, running defaults) plus live logs to build dropdowns and card selectors; each saved row is treated as the canonical payload for rendering the weekly selector, dropdown states, and monthly grid so semantics stay centralized in Studio.
- Indok: this keeps the expanded journaling surface within the Studio guardrails, reuses the existing auth/API flow, and keeps Explorer-free until the feature is finalized while producing a structured activity contract for future Explorer consumers.

---

## D28 – Identification key_features: dinamikus cím + axis mező (v2.3)

- A `blocks_json.identification.key_features` 4 eleme továbbra is a négy azonosítási tengelyt fedi le (csőr / tollazat / hang / mozgás), de a panelcím mostantól **dinamikus, madár-specifikus** rövid cím (`title`), amit egy hosszabb, konkrét azonosítási leírás (`description`) követ.
- A tengelyek stabil jelöléséhez a key_feature kap egy kötelező `axis` mezőt (`csor|tollazat|hang|mozgas`), így a UI szabadabban fogalmazhat címeket anélkül, hogy elveszne a 4-pontos struktúra.
- A dossier schema verzió `v2.3`-ra lép; a parser továbbra is elfogadja a `v2.2`-t is (backward compatible).
- A Studio text review felületen a main_habitat kép alá bekerül egy célzott “Regenerate traits” gomb, ami csak az `identification` blokkot generálja újra (server-side AI), a többi dossier mezőt érintetlenül hagyva.

Indok: a korábbi fix “Csőr/Tollazat/Hang/Mozgás” címek túlságosan sablonosak voltak, és a felismerés szempontjából fontos, fajspecifikus kulcsjegyek kevésbé emelkedtek ki.

---

## D29 – Studio UI mobil ellenőrzés (<= 420px)

- A Studio admin felületnek mobil nézeten is használhatónak kell maradnia (<= 420px).
- Minden UI-t érintő változtatásnál kötelező legalább egy gyors manuális ellenőrzés mobil szélességen (F4 evidence részeként dokumentálva).

Indok: az admin felületet terepen/telefonról is használjuk; a regressziók tipikusan layout/touch problémákból jönnek.

---

## D30 – Chef receptek: Admin-only, iteratív generálás + Accept

- Új Admin-only modul: `/admin/chef` (Studio guard alatt), Explorer nem látja.
- Két input alapján (recept név + rövid leírás) server-side AI generál szigorúan validált JSON recept payloadot (v1), alapértelmezett `servings = 2` mellett.
- A recept payload strukturált hozzávalókat tartalmaz (`amount` number|null + `unit` string|null), hogy a UI képes legyen a servings érték változtatásakor kliens oldalon skálázni.
- Állapot: `draft` → “Accept” → `approved`. Review note esetén regenerálás történik (vissza `draft`), majd új Accept-tel ismét `approved`.
- A mentés “A” mód: az aktuális recept payload felülírható a következő regeneráláskor, de a rekord tartalmazza a legutóbbi review note-ot és a generálás metaadatait (model + generated_at).

Indok: minimál, gyors admin workflow, de determinisztikus contracttal és kontrollált iterációval.

---

## D31 – Place system foundation + minimal public map surface

- A Place egy **desztináció-szintű** madármegfigyelő helyszín (nem megfigyelési pont, nem precíz koordináta).
- Place kap saját editorial state-et: `draft` → `reviewed` → `published`; publish után nincs rollback (v0).
- A Place szöveges tartalmak UI-variánsai (teaser/short/long/seasonal_snippet/ethics_tip/...) a `content_blocks` rekordban, strukturált JSON payloadként tárolódnak, szigorú Zod-validációval; AI generálás kizárólag szerver oldalon történik.
- Publish gate (Place): kötelező meta (name/slug/place_type/region_landscape/county/nearest_city) + kötelező content variánsok (short + seasonal_snippet + ethics_tip) approved.
- Etikai védelem: `location_precision (exact|approximate|hidden)` + `sensitivity_level (normal|sensitive)` mezők; `hidden` esetén a helynek nincs publikus térképes jelölője.
- Minimal public surface: `/places` read-only map + panel (Leaflet; D39 static map defaults) csak published+approved Place rekordokat jelenít meg; nincs runtime AI, nincs service role key kliens oldalon.

Indok: a Place entitások hamar publikus UI elemek lesznek, ezért most kell a stabil adatmodell + workflow + szerver oldali publish gating, miközben a teljes Explorer buildout továbbra is későbbi fázis.

---

## D33 – Place: name-only quick-create + optional multi-type (primary + extras)

- A Place továbbra is rendelkezik egy elsődleges `place_type` mezővel (priority type), de opcionálisan tárolhat több kategóriát is: `place_types` (enum array), amely **mindig tartalmazza** az elsődleges típust.
- A Studio `/admin/places` Quick Create minimális inputja csak a `name`. A hiányzó meta (type/region/county/city + beginner/practical) AI-draftként készül el; bizonytalanság esetén az AI `null`-t ad vissza, és a szerkesztő felelőssége a validálás.
- Indok: gyorsabb indulás egy valós, named location alapján, miközben megmarad az editorial kontroll és a publish gate nem enged át hiányos vagy nem approved tartalmat.

---
## D34 – Place: UI variants output schema (place_ui_variants_v1)

- A Place panel szöveges tartalma strukturált JSON-ként tárolódik a `content_blocks.blocks_json` mezőben, `schema_version="place_ui_variants_v1"` és `language="hu"` mellett.
- Canonical UI variant blokkok a `variants` objektumban: `teaser`, `short`, `long`, `seasonal_snippet`, `ethics_tip`, `did_you_know`, `practical_tip`, `when_to_go`, `who_is_it_for`, `nearby_protection_context`.
- Kötelező mentési/publish feltételek (v1): `short`, `ethics_tip`, valamint a `seasonal_snippet.spring/summer/autumn/winter` mindegyike (nem üres).
- Opcionális mezők lehetnek üres stringek.
- Forward-compat: a payload enged extra kulcsokat (unknown catchall) a root és `variants` szinten; breaking változásnál schema verzió bump szükséges.

Indok: konzisztens, UI-barát Place panel contract, ami egyszerre AI-kompatibilis és manuálisan szerkeszthető, miközben megőrzi a publish gating egyszerűségét.

---

## D41 – Place: notable units (places.notable_units_json)

- A Place-en belüli, névvel rendelkező alegységek (pl. halastórendszer egy tava, sziget, ösvény-szakasz) **nem** külön Place entitások v1-ben; csak tájékoztató, látogatói szintű struktúra.
- Canonical tárolás: `places.notable_units_json` (jsonb, nullable), a public felület erről olvas.
- Séma (v1): tömb (0–8 elem), elem: `{ name, unit_type?, distance_text?, short_note, order_index }`.
  - `unit_type` opcionális technikai enum: wetland | fishpond | lake_section | reedbed | lookout | trail | island | shoreline | grassland_section | forest_section | other
  - `distance_text` opcionális, emberi relatív szöveg (nem koordináta, nem pusztán szám)
  - `short_note` kötelező, 1–2 mondat, nem túl magabiztos, nem érzékeny
  - `order_index` kötelező, 1-től indul
- AI generálás kizárólag szerver oldalon, validált és normalizált outputtal; bizonytalanság esetén üres lista az alapértelmezett (hallucináció kerülése).
- Regenerálás explicit editor művelet (Place Notable Units panel): nem írjuk felül a kézzel szerkesztett listát a normál content regenerálás során.

Indok: a Place panelben hasznos belső tájékozódási struktúra, miközben nem csúszunk át precíz megfigyelési pont / monitoring jellegű granularitásba.

## D35 – Place → Bird suggestion engine (editor-assist, non-publishing)

- Cél: amikor egy Place létrejön / regenerálódik, a rendszer javasoljon 8–12 tipikusan megfigyelhető madárfajt a helyhez, **szerkesztői segítségként** (nem automatikus publikálás).
- AI csak szerver oldalon fut; Explorerben nincs runtime generálás.
- A javaslatok a `place_birds` táblába kerülnek `review_status="suggested"` állapotban (nem publikus).
- A szerkesztő a Place Birds panelen:
  - elfogadhatja (`review_status="approved"`) vagy törölheti a javaslatot,
  - módosíthatja a gyakoriságot (place_frequency_band), szezonalitást, iconic flag-et, rank-et,
  - meglévő Bird-hez linkelheti (bird_id), vagy pending névként hagyhatja (pending_bird_name_hu),
  - manuálisan felvihet új kapcsolatot (alapból `review_status="approved"`).
- Public API / Explorer csak `review_status="approved"` place_birds sorokat jelenít meg.
- Dedup: place_id + bird_id, illetve place_id + lower(pending_bird_name_hu) szinten; a suggestion engine nem írja felül a meglévő (szerkesztett) sorokat, csak újakat ad hozzá.

Indok: Place → suggested birds → editor review → (opcionálisan) Bird generálás → kapcsolatok; így organikusan bővül a faj- és helyháló, miközben a publikus felület kontrollált marad.

## D32 – Approved képek lockolása regen alatt (Bird images)

- A képgenerálás engedélyezett `bird.status = images_approved` állapotban is (nem published), hogy a hiányzó vagy még nem jóváhagyott variánsok pótolhatók legyenek.
- Lock szabály: ha egy variáns current képe `review_status=approved`, akkor az a variáns **nem** regenerálható és nem írható felül (marad current).
- Regenerálási szabály: csak a hiányzó, `draft` vagy `reviewed` variánsok generálódnak újra.
- A review note prompt inputként bekerül (`images.review_comment` → `review_note`), de az újonnan generált kép recordja tiszta `review_comment = null` (a note nem “ragad át” a következő verzióra).

Indok: a publish-ready, approved asseteket védeni kell a véletlen felülírástól; ugyanakkor az opcionális/under-review képek iterációja maradjon gyors.

---

## D36 – Admin Dashboard: published Places map + seasonal bird hover cards

- A Studio `/admin` Dashboard tetején megjelenik egy full-screen Magyarország térkép (Leaflet; D39 static map defaults), amely csak **published** Place-eket jelöl (rejtett location nem jelenhet meg).
- Hoverre egy popup kártya jelenik meg a helyhez, amely a Place canonical UI contractját használja:
  - `variants.short`
  - `variants.seasonal_snippet[currentSeason]`
  - top 5, az aktuális évszakban látható madár (Place → Bird linkek alapján).
- Gating szabályok:
  - Place: `status="published"`, `location_precision != "hidden"`.
  - Place → Bird: csak `place_birds.review_status="approved"` sorok.
  - Bird: csak `status="published"` jelenhet meg publikus jellegű dashboard summaryban.
- A Dashboard alatt “Habitat spotlights” blokk 3 oszloppal (vízpart/erdő/hegység), oszloponként ~7 madárral (habitat ikon + név + linkelt helyszín(ek)).

Indok: a Place rendszer publikálása után gyors, vizuális ellenőrző felület kell a dashboardon a publikált helyekről, az aktuális szezon tartalmáról, és a publikálásban szereplő madár-kapcsolatokról.

---

## D39 – Leaflet display maps: static view + minimal basemap v1

- Cél: a display-only Leaflet térképek (public `/places`, Admin Dashboard Places map, Bird distribution maps, Bird leaflets mini maps) egységesen statikus nézetet adjanak: nincs zoom/pan, nem “elviszi” a görgetést, és vizuálisan minimalista.
- Basemap: `basemap="bird"` (CARTO no-label tiles: `light_nolabels` / `dark_nolabels` a rendszer color scheme-je szerint).
- Interakciók tiltása: `zoomControl=false`, `scrollWheelZoom=false`, `doubleClickZoom=false`, `dragging=false`, `keyboard=false`, `boxZoom=false`, `touchZoom=false` (és ahol releváns: `tap=false`).
- Kamera rögzítés: map-specifikus center+zoom; szükség esetén `minZoom=maxZoom` (react-leaflet) vagy `setMinZoom/setMaxZoom` (vanilla Leaflet) használható.
- Kontrakt: a jelölések / overlayk színe és legendája modulonként marad (ahogy most is), csak a basemap és az interakciós defaultok közösek.
- Kivétel: szerkesztő jellegű picker térképek (pl. PlaceLocationPicker) interaktívak maradnak.

Indok: következetes UX (scroll/zoom konfliktus elkerülése), olvasható UI overlayk, és auditálható, specelt map baseline.

---

## D40 – Public `/places` brand map: Hungary outline + water mask (no tiles)

**Status:** Accepted  
**Date:** 2026-03-10  
**Scope:** Explorer public `/places` only.

### Decision
- Add a tile-less basemap mode (`basemap="brand"`) for the public Places map:
  - Page background is used as land “paper”.
  - A theme-aware water fill is rendered as a mask outside the Hungary outline.
  - Only the Hungary border is drawn in `--brand-ink`; no roads, county borders, or other cartography.
  - Leaflet attribution control is hidden (no third-party tile content is used in this mode).
- Admin/Studio maps remain on the D39 `basemap="bird"` CARTO tiles.

### Data source
- Hungary outline geometry is embedded from Natural Earth Admin-0 Countries (110m) feature `ISO_A3="HUN"` (public domain).

### Rationale
- Brand-forward, deterministic rendering without external basemap dependencies.
- Avoids OSM/CARTO attribution requirements by not loading their tiles on `/places`.

## D37 – Birdwatch sightings log v1 (Studio-only)

**Status:** Accepted  
**Date:** 2026-03-10  
**Scope:** Studio admin surfaces. Explorer out of scope.

### Context
Need a fast way to record “I saw this bird” events during content work / field use, and show them on the Studio dashboard.

### Decision
- Introduce a Studio-only “sightings” module:
  - A sticky button on protected admin pages opens a small popup panel for recording sightings.
  - The `/admin` dashboard shows the latest sightings for the current admin (timestamp + selected birds).
- Persist sightings in a dedicated table pair:
  - `bird_sightings` (who + when + optional notes)
  - `bird_sighting_birds` (join table for one-or-more selected birds; extensible for per-bird quantity later)
- Server-side gating:
  - All writes and reads are authenticated via `getAdminUserFromCookies`.
  - DB RLS policies allow `service_role` for all operations (matching existing server-only patterns).

### Out of scope (v1)
- Explorer rendering or public sharing of sightings.
- Location capture, media uploads, or AI-assisted identification.

---

## D38 – Bird color tags v1 (Studio filters)

**Status:** Accepted  
**Date:** 2026-03-10  
**Scope:** Studio Bird metadata + admin picker filters. Explorer out of scope.

### Context
The Bird registry needs a deterministic, queryable color facet to support sightings picker filtering (and future public surfaces) without client-side inference.

### Decision
- Add `birds.color_tags` as an enum-array field (`bird_color_tag[]`) with a small curated palette (v1).
- `color_tags` are initialized during Bird dossier generation (server-side) via `dossier.pill_meta.color_bg` (single tag), so Studio cards/filters have a deterministic default without manual General-tab editing.
- Filtering uses canonical `birds` fields only (no dossier text reinterpretation in UI).

### Out of scope (v1)
- Automated extraction of colors from images/text.
- A separate audited artifact table for color suggestions.

---

## D39 – Birdwatch sightings: Place-first picker + soft recommendations

**Status:** Accepted  
**Date:** 2026-03-10  
**Scope:** Studio Birdwatch panel UX only. Explorer out of scope.

### Context
Birdwatch logging should reflect “I saw X at place Y”, and help selection by prioritizing birds that are already linked to the chosen Place, without hiding other matches.

### Decision
- The Birdwatch popup requires selecting a Place first, then selecting Birds.
- The “recommended” list is a single filtered list where ordering is boosted by Place links:
  - Place-linked birds (approved `place_birds`) appear first (rank order),
  - followed by other matches (name order).
- Color filter UI uses square swatches and updates the recommended list reactively.

### Out of scope (v1)
- Hard exclusion based on Place links (it remains a soft priority).
- Seasonality-aware ranking (can be added later).

---

## D42 – Place hero image (spring, scientific) + publish gate

**Status:** Accepted  
**Date:** 2026-03-10  
**Scope:** Studio Place workflow (generation, review, publish preview). Explorer remains read-only and has no runtime AI.

### Context
- Place publish cards should show a full-bleed hero image at the top (approved only).
- We need a controlled, review-gated way to generate that asset server-side.

### Decision
- Add a single Place image output (v1):
  - `entity_type="place"`, `style_family="scientific"`, `variant="place_hero_spring_v1"`.
  - Intent: a realistic, scientific-style spring highlight moment for the place (no fantasy/cartoon).
- Publish gate (Place) requires:
  - required metadata + approved UI variants (per D31), and
  - an **approved** current hero image for `place_hero_spring_v1`.
- Studio UX:
  - Place editor includes an `Images` view for generating and approving the hero image.
  - Publish preview renders the approved hero image above the header (full-bleed, with overlay pills); the map preview remains below.

### Out of scope (v1)
- Additional seasons or multiple Place image variants.
- Iconic Place images.
- Any runtime generation on Explorer/public surfaces.

---

## D43 – Admin dashboard Places map: bounded HU pan/zoom v1

**Status:** Accepted  
**Date:** 2026-03-11  
**Scope:** Studio `/admin` dashboard Places map only.

### Context
- D39 sets display-only maps to be fully static to avoid scroll/zoom conflicts.
- On the Studio dashboard we still want lightweight exploration (move/zoom a bit) while staying Hungary-focused.

### Decision
- Add a dashboard-only interaction mode for the Places map:
  - Panning enabled but constrained to a Hungary bounding box (`maxBounds` + `maxBoundsViscosity=1`).
  - Zoom enabled via zoom controls and touch gestures (scroll-wheel zoom stays off).
  - Tight zoom range (v1: `minZoom=6`, `maxZoom=10`) to keep the view Hungary-focused.
- Other display-only map surfaces remain D39-static by default.

### Out of scope (v1)
- Free pan/zoom or world navigation.
- Changing public `/places` interaction defaults.

---

## D44 – Yoga Guru (planned): server-side ajánlás + ActivityLog rögzítés

**Status:** Accepted  
**Date:** 2026-03-11  
**Scope:** Studio `/admin/yoga` (Admin-only). Explorer out of scope. No runtime AI.

### Context
- A Yoga felület jelenleg “normál módon” nap kiválasztásával és ActivityLog mentéssel működik.
- Szükség van egy dinamikusabb, “guru” jellegű, vezetett ajánló flow-ra, ami a felhasználó előzményei és heti céljai alapján javaslatot ad az adott napra.

### Decision (v1 irány)
- A Yoga Guru AI hívás **csak server-side** történik.
- A Guru outputja **szigorúan validált JSON contract**, és több javaslatot ad (DB template / YouTube link / YouTube kereső kulcsszavak).
- A Yoga Guru külön oldalként készül (v1: `/admin/yoga/guru`).
- A kiválasztott javaslat rögzítése a meglévő `activity_logs` contracton keresztül történik (nincs külön “guru log” tábla v1-ben); extra információk `metadata` alá kerülhetnek.
- A journaling modell insert-alapú: több log/nap/tevékenység engedett (összhangban D16-tal).
- Modell az env-ből jön (nincs hardcoded model id).

### Open questions
- A “heti terv” kanonikus tárolása (jelenleg nincs dedikált terv tábla a repóban).
- A “kommentek” kanonikus tárolása (v1-ben lehet `activity_logs.notes`, de új táblák is megengedettek).

### Out of scope (v1)
- Anatómiai és jóga katalógus generálás/pipeline.
- YouTube API integráció és automatikus videó meta letöltés.

---

## D46 – Bird distribution map batch refresh tool v1 (Studio)

**Status:** Accepted  
**Date:** 2026-03-11  
**Scope:** Studio only (Admin). Explorer out of scope. No runtime AI.

### Context
- D24/D26 bevezette a per-madár “Generate/Regenerate distribution map” actiont, ami AI-val kiválaszt régió ID-kat, majd a szerver katalógusból GeoJSON-t expandál.
- A madárlistán sok entitás esetén kényelmetlen kézzel végigmenni és egyesével újragenerálni a distribution térképeket.

### Decision
- Új admin-oldal: `/admin/birds/distribution-maps`.
- A batch UI kliens-oldalról sorban meghívja a meglévő szerver oldali endpointot: `POST /api/birds/:id/distribution-map/generate`.
- A felület “háttérben futó” progress-t mutat (fut / ok / hiba), és képes leállítani a folyamatot, illetve újrapróbálni a hibás tételeket.
- V1-ben nincs külön queue / worker / DB-ben tárolt batch-run állapot; a futás a böngésző session-höz kötött.

### Out of scope (v1)
- Tartós batch-run státusz (resume több session között).
- Párhuzamos futtatás, rate-limit menedzsment.
- Automatikus futtatás publish/approve eseményekre.

---

## D47 – Distribution map notes per status v1 (Studio hover)

**Status:** Accepted  
**Date:** 2026-03-11  
**Scope:** Studio Bird distribution maps only.

### Context
- A Bird distribution map régió-alapú (D24/D26) rétegeihez a UI hover részleteket mutat (státusz/bizonyosság/megjegyzés).
- A “note” mező eddig opcionális volt, ezért sok esetben üresen maradt, és a hover kevésbé volt informatív.

### Decision
- A generálás output contractjában a `ranges[].note` mező **kötelező** (rövid, 1–2 mondatos indoklás rétegenként).
- A UI a note-ot hoverre továbbra is megjeleníti; ha egy státusz nem vállalható, az a réteg maradjon inkább kihagyva (nem “üres note”-tal).

### Out of scope (v1)
- Note lokalizáció több nyelvre.
- Régió-lista UI (region_ids) részletezés a hoverben.

---

## D49 – Places: batch refill Place→Bird links (published-only) v1 (Studio)

**Status:** Accepted  
**Date:** 2026-03-11  
**Scope:** Studio `/admin/places` only. Explorer out of scope. No runtime AI.

### Context
- A Place szerkesztőben van manuális “Suggest birds” trigger (D35), ami `place_birds` sorokat szúr be `review_status="suggested"` státusszal.
- A workflow-ban gyakori, hogy új Bird-ek publikálása után több published Place-hez is gyorsan fel kell tölteni a hiányzó Place→Bird linkeket.

### Decision
- Az `/admin/places` listában megjelenik egy batch “Refill links” eszköz.
- A batch kliens-oldalról sorban hívja a meglévő endpointot: `POST /api/places/:id/birds/suggest?existing_published_only=true`.
- `existing_published_only=true` módban a suggestion engine **csak** már létező, **published** Bird rekordokra linkel (nem szúr be `pending_bird_name_hu` sorokat).
- Alapértelmezésben a beszúrt linkek `review_status="suggested"` státuszban maradnak; publikussá csak explicit editor approval után válhatnak.
- Opcionális auto-approve: a batch hívhatja ugyanazt az endpointot `review_status=approved` paraméterrel, de csak `existing_published_only=true` mellett.

### Out of scope (v1)
- Hosszú futású szerver-oldali batch/queue/worker; a batch a böngésző session-höz kötött.
- Draft/reviewed Bird-ek automatikus linkelése.
