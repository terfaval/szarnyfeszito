# Szárnyfeszítő – Döntésnapló

---

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
- Allows incremental enrichment without blocking the publish pipeline.

### Out of scope
- External bird databases/APIs to source true distribution statistics.
- Explorer UX changes.

## D17 — Image Accuracy Pipeline v1 (Science Dossier + Visual Brief gating)

**Status:** Accepted  
**Date:** 2026-03-05  
**Scope:** Content Studio (Bird text+image review + publish gating). Explorer out of scope.

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
