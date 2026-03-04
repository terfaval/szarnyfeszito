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
