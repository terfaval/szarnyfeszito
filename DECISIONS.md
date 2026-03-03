# Szárnyfeszítő – Döntésnapló

---

## D11 â€“ Publish CTA szerinti állapotvédelem

- A Publish CTA csak akkor jelenik meg, ha a madár státusza legalább az `images_approved`, és az összes GateChecklist-kritérium (text_approved státusz, legalább egy `main_habitat` és a `fixed_pose_icon_v1` jóváhagyott) teljesült.
- A StatusPill, GateChecklist és maga a CTA ugyanarra a `BIRD_STATUS_VALUES` sorrendre épül, így a státuszfolyam logikája közvetlenül vezérli a publikus lépéseket.
- A CTA a `/api/birds/:id` PATCH hívásával állítja `published`-ra a madár státuszát, tehát a backend is kap visszajelzést a státuszváltásról.

Indok: A publish művelet csak akkor válik elérhetővé, amikor a SPEC-ben leírt text/images jóváhagyások megvannak, és így a frontend nem engedélyezi a publikálást, amíg a szöveg és a fő habitat + ikonikus kép nem lett approved.

## D12 – Dossier schema v2.1 Field-Guide upgrade

- Bird dossier content_blocks továbbra is egy JSON struktúrát tartalmaz: mostantól mindegyik draft `schema_version` mezője `"v2.1"`, és a payload kifejezetten a header, pill_meta, short_options (három 120+ karakteres tagline), long_paragraphs (2–5 bekezdés), identification (kulcsjellemzők + összegző bekezdés), distribution (taxonómia + IUCN + régiók + jegyzet), nesting, migration, valamint a fun_fact, ethics_tip és typical_places blokkokat tartalmazza.
- A schema szigorú validációval (`z.strict()`) ellenőrzi a mezők jelenlétét, a stringek trimelt állapotát, a minimális számú bejegyzéseket és a short_option karakterhosszt, így ígérvén új, granularizált review útvonalat a blokkoknak.
- Új generáció csak v2.1 payloadot hozhat létre; ha legacy v1 dossierhoz nyúlunk, azt nem automatikusan migráljuk, de továbbra is lenni kell neki, amíg a pipeline nem migrált visszafelé. A korábbi `fact_box`/`quick_traits` blokkokat centralizáltan a pill_meta/identification/distribution-csoportok váltják fel.

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
